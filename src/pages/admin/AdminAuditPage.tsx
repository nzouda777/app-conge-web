import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { fetchAuditDigest, fetchAuditFacets, listAuditEntries } from '../../api/admin';
import { getApiErrorMessage } from '../../api/client';
import { auditActionLabel, auditEntityLabel } from '../../types/auditLabels';
import { tokens } from '../../theme/tokens';
import type { AuditEntry } from '../../types/api';

// Journal d'audit.
//
// La table était auparavant en ÉCRITURE SEULE : aucune route, aucun écran ne
// permettait de la lire, ce qui privait la traçabilité — l'une des raisons
// d'être du système — de tout usage. On ne pouvait répondre depuis
// l'application ni à « qui a validé ce congé », ni à « qui a tenté de se
// connecter sur ce compte ».
//
// L'écran est en lecture seule par construction : il n'existe aucun point
// d'entrée d'écriture côté API, et un déclencheur PostgreSQL refuse toute
// modification ou suppression d'une ligne d'audit.

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso));
}

function StatTile({
  label,
  value,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'warning' | 'danger';
  hint: string;
}) {
  const color =
    tone === 'danger' ? tokens.dangerText : tone === 'warning' ? tokens.warningText : tokens.brand;
  return (
    <Paper sx={{ p: 2.25, height: '100%' }}>
      <Typography sx={{ fontSize: 28, fontWeight: 600, color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 500, mt: 0.75 }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, color: tokens.inkSecondary, mt: 0.25 }}>{hint}</Typography>
    </Paper>
  );
}

function EntryRow({ entry, sensitive }: { entry: AuditEntry; sensitive: boolean }) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!entry.metadata || !!entry.userAgent || !!entry.requestId;

  return (
    <>
      <TableRow
        hover
        sx={sensitive ? { bgcolor: tokens.dangerSoft } : undefined}
      >
        <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          {formatDateTime(entry.createdAt)}
        </TableCell>
        <TableCell>
          <Typography sx={{ fontSize: 15, fontWeight: sensitive ? 600 : 400 }}>
            {auditActionLabel(entry.action)}
          </Typography>
          <Typography sx={{ fontSize: 13, color: tokens.inkSecondary, fontFamily: 'monospace' }}>
            {entry.action}
          </Typography>
        </TableCell>
        <TableCell>
          {/* `actorLabel` est recopié au moment de l'écriture : supprimer un
              compte annule `actorId` mais n'efface pas qui a agi. */}
          <Typography sx={{ fontSize: 15 }}>{entry.actorLabel ?? '—'}</Typography>
          {entry.actor?.email && (
            <Typography sx={{ fontSize: 13, color: tokens.inkSecondary }}>{entry.actor.email}</Typography>
          )}
          {!entry.actorId && entry.actorLabel && (
            <Tooltip title="Le compte a été supprimé depuis ; l'identité de l'auteur est conservée.">
              <Chip label="compte supprimé" size="small" sx={{ fontSize: 13, height: 18, mt: 0.5 }} />
            </Tooltip>
          )}
        </TableCell>
        <TableCell>
          <Typography sx={{ fontSize: 14 }}>{auditEntityLabel(entry.entityType)}</Typography>
          {entry.entityId && (
            <Typography sx={{ fontSize: 13, color: tokens.inkSecondary, fontFamily: 'monospace' }}>
              {entry.entityId.slice(0, 8)}…
            </Typography>
          )}
        </TableCell>
        <TableCell sx={{ fontFamily: 'monospace', fontSize: 14 }}>{entry.ip ?? '—'}</TableCell>
        <TableCell align="right">
          {hasDetail && (
            <Button
              size="small"
              onClick={() => setOpen((o) => !o)}
              endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              aria-expanded={open}
              aria-label={open ? 'Masquer le détail' : 'Afficher le détail'}
            >
              Détail
            </Button>
          )}
        </TableCell>
      </TableRow>
      {hasDetail && (
        <TableRow>
          <TableCell colSpan={6} sx={{ py: 0, border: 0 }}>
            <Collapse in={open} unmountOnExit>
              <Box sx={{ py: 1.5, pl: 2 }}>
                {entry.requestId && (
                  <Typography sx={{ fontSize: 14, color: tokens.inkSecondary }}>
                    Référence de la requête :{' '}
                    <Box component="span" sx={{ fontFamily: 'monospace' }}>
                      {entry.requestId}
                    </Box>
                  </Typography>
                )}
                {entry.userAgent && (
                  <Typography sx={{ fontSize: 14, color: tokens.inkSecondary, wordBreak: 'break-word' }}>
                    Poste : {entry.userAgent}
                  </Typography>
                )}
                {entry.metadata && (
                  <Box
                    component="pre"
                    sx={{
                      fontSize: 13,
                      fontFamily: 'monospace',
                      bgcolor: tokens.surfaceSunk,
                      p: 1.25,
                      mt: 1,
                      borderRadius: 1,
                      overflowX: 'auto',
                      m: 0,
                    }}
                  >
                    {JSON.stringify(entry.metadata, null, 2)}
                  </Box>
                )}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function AdminAuditPage() {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const digest = useQuery({ queryKey: ['audit', 'digest'], queryFn: fetchAuditDigest });
  const facets = useQuery({ queryKey: ['audit', 'facets'], queryFn: fetchAuditFacets });

  const params = {
    action: action || undefined,
    entityType: entityType || undefined,
    search: search.trim() || undefined,
    from: from || undefined,
    to: to || undefined,
    page: page + 1,
    pageSize,
  };
  const entries = useQuery({
    queryKey: ['audit', 'entries', params],
    queryFn: () => listAuditEntries(params),
  });

  const sensitive = new Set(facets.data?.sensitiveActions ?? []);
  const hasFilter = !!(action || entityType || search || from || to);

  function resetFilters() {
    setAction('');
    setEntityType('');
    setSearch('');
    setFrom('');
    setTo('');
    setPage(0);
  }

  return (
    <Box>
      <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, color: tokens.brand, mb: 0.5 }}>
        Journal d'audit
      </Typography>
      <Typography sx={{ color: tokens.inkSecondary, mb: 3, maxWidth: '68ch' }}>
        Toutes les actions de la plateforme y sont consignées, avec leur auteur, leur origine et
        leur horodatage. Le journal est en ajout seul : une ligne écrite ne peut plus être modifiée
        ni supprimée, y compris par l'administration.
      </Typography>

      {/* Synthèse de sécurité : ce qu'il faut voir avant de filtrer. */}
      {digest.data && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatTile
              label="Échecs de connexion"
              value={digest.data.failedLogins24h}
              tone={digest.data.failedLogins24h > 20 ? 'danger' : 'neutral'}
              hint="dernières 24 heures"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatTile
              label="Comptes bloqués"
              value={digest.data.lockouts7d}
              tone={digest.data.lockouts7d > 0 ? 'warning' : 'neutral'}
              hint="7 derniers jours"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatTile
              label="Mots de passe réinitialisés"
              value={digest.data.passwordResets7d}
              hint="par l'administration, 7 jours"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatTile
              label="Changements de rôle"
              value={digest.data.roleChanges7d}
              tone={digest.data.roleChanges7d > 0 ? 'warning' : 'neutral'}
              hint="7 derniers jours"
            />
          </Grid>
        </Grid>
      )}

      {digest.data && digest.data.topFailedLoginSources.length > 0 && (
        <Alert severity="info" role="status" sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 0.5 }}>
            Origines des échecs de connexion (7 jours)
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {digest.data.topFailedLoginSources.map((s) => (
              <Chip
                key={s.ip ?? 'inconnue'}
                label={`${s.ip ?? 'origine inconnue'} — ${s.count}`}
                size="small"
                onClick={() => {
                  setSearch(s.ip ?? '');
                  setAction('LOGIN_FAILED');
                  setPage(0);
                }}
                sx={{ fontFamily: 'monospace' }}
              />
            ))}
          </Stack>
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: 'flex-end' }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              select
              label="Action"
              fullWidth
              size="small"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">Toutes</MenuItem>
              {facets.data?.actions.map((a) => (
                <MenuItem key={a.value} value={a.value}>
                  {auditActionLabel(a.value)} ({a.count})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              select
              label="Objet"
              fullWidth
              size="small"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">Tous</MenuItem>
              {facets.data?.entityTypes.map((e) => (
                <MenuItem key={e.value} value={e.value}>
                  {auditEntityLabel(e.value)} ({e.count})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              label="Auteur, référence ou adresse IP"
              fullWidth
              size="small"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <TextField
              label="Du"
              type="date"
              fullWidth
              size="small"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
              }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <TextField
              label="Au"
              type="date"
              fullWidth
              size="small"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
              }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
        </Grid>
        {hasFilter && (
          <Button size="small" onClick={resetFilters} sx={{ mt: 1.5 }}>
            Effacer les filtres
          </Button>
        )}
      </Paper>

      {entries.isError && (
        <Alert severity="error" role="alert" sx={{ mb: 2 }}>
          {getApiErrorMessage(entries.error, 'Impossible de charger le journal.')}
        </Alert>
      )}

      <Paper>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Horodatage</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Auteur</TableCell>
                <TableCell>Objet</TableCell>
                <TableCell>Origine</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} aria-label="Chargement du journal" />
                  </TableCell>
                </TableRow>
              )}
              {entries.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 4, textAlign: 'center', color: tokens.inkSecondary }}>
                    {hasFilter
                      ? 'Aucune entrée ne correspond à ces filtres.'
                      : "Le journal est vide : aucune action n'a encore été enregistrée."}
                  </TableCell>
                </TableRow>
              )}
              {entries.data?.items.map((entry) => (
                <EntryRow key={entry.id} entry={entry} sensitive={sensitive.has(entry.action)} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={entries.data?.total ?? 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100, 200]}
          labelRowsPerPage="Lignes par page"
          labelDisplayedRows={({ from: f, to: t, count }) => `${f}–${t} sur ${count}`}
        />
      </Paper>
    </Box>
  );
}

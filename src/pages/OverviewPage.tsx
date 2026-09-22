import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchRequestsOverview, listRequests } from '../api/requests';
import { StatusBadge } from '../components/StatusBadge';
import { ActivityChart } from '../components/ActivityChart';
import { EmployeeHistoryPanel } from './EmployeeHistoryPanel';
import { REQUEST_TYPE_LABELS, formatDate } from '../types/labels';
import { TONE_COLORS, type Tone } from '../theme/statusColors';
import type { RequestType } from '../types/api';

// Carte d'indicateur. La pastille colorée porte le sens ; le chiffre reste en
// encre, jamais dans la couleur de la série.
function StatTile({
  label,
  value,
  sub,
  tone = 'progress',
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: Tone;
}) {
  const c = TONE_COLORS[tone];
  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
        <Box sx={{ width: 22, height: 22, borderRadius: 1, bgcolor: c.soft, display: 'grid', placeItems: 'center' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.main }} />
        </Box>
        <Typography sx={{ fontSize: 10.5, color: '#5D6D7E', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 26, fontWeight: 700, color: '#1B4F72', lineHeight: 1.1 }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize: 11, color: '#5D6D7E', mt: 0.3 }}>{sub}</Typography>}
    </Paper>
  );
}

// Barre horizontale : extrémité arrondie, ancrée à la ligne de base, fond
// discret. Le libellé et la valeur restent en encre.
function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Typography sx={{ fontSize: 12.5, color: '#5D6D7E', flex: '0 0 45%' }}>{label}</Typography>
      <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: '#F2F4F7', overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color, borderRadius: 4 }} />
      </Box>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#1B4F72', flex: '0 0 30px', textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  );
}

// Une étape du circuit : le compteur, puis ce qu'il désigne.
function Step({ count, label, tone }: { count: number; label: string; tone: Tone }) {
  const c = TONE_COLORS[tone];
  return (
    <Box sx={{ textAlign: 'center', minWidth: 78 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          bgcolor: c.soft,
          border: `1.5px solid ${c.main}55`,
          display: 'grid',
          placeItems: 'center',
          mx: 'auto',
          mb: 0.7,
        }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: c.text }}>{count}</Typography>
      </Box>
      <Typography sx={{ fontSize: 11, color: '#5D6D7E', lineHeight: 1.25 }}>{label}</Typography>
    </Box>
  );
}

function Arrow() {
  return <Box sx={{ flex: 1, height: 1.5, bgcolor: '#D8DFE6', minWidth: 14, mt: -2 }} />;
}

// Vue de pilotage du circuit. Partagée par la SDAG, le Directeur Général et
// l'administration : les indicateurs d'ensemble sont identiques pour les
// trois, seul le bloc « Actions requises » s'adapte à qui regarde. Les
// couleurs y sont globales et ne dépendent pas de l'utilisateur.
export function OverviewPage({ showHeading = true }: { showHeading?: boolean }) {
  const { user } = useAuth();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);

  const { data: o } = useQuery({
    queryKey: ['requests', 'overview', year],
    queryFn: () => fetchRequestsOverview(year),
  });
  const { data: pending } = useQuery({
    queryKey: ['requests', 'overview-pending'],
    queryFn: () => listRequests({ status: 'PENDING_MANAGER_REVIEW', page: 1, pageSize: 50 }),
  });

  const mine = pending?.items.filter((r) => r.employee.managerId === user?.employeeId) ?? [];
  const s = o?.byStatus ?? {};
  const signed = s.APPROVED ?? 0;
  const stopped = (s.REJECTED ?? 0) + (s.MANAGER_REJECTED ?? 0);

  const typeRows = (Object.keys(REQUEST_TYPE_LABELS) as RequestType[])
    .map((t) => ({ t, v: o?.byType[t] ?? 0 }))
    .sort((a, b) => b.v - a.v);
  const typeMax = Math.max(1, ...typeRows.map((r) => r.v));
  const loadMax = Math.max(1, ...(o?.agentLoad ?? []).map((a) => a.count));

  const delay = (v: number | null | undefined) => (v === null || v === undefined ? '-' : `${v} j`);

  return (
    <Box>
      {showHeading && (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72' }}>Tableau de bord</Typography>
            <Typography sx={{ fontSize: 13, color: '#5D6D7E' }}>
              Vue d'ensemble de la Direction Générale du Budget
            </Typography>
          </Box>
          <TextField
            select
            size="small"
            label="Exercice"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            sx={{ minWidth: 120 }}
          >
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatTile label="Demandes" value={o?.total ?? 0} sub={`exercice ${o?.year ?? year}`} tone="neutral" />
        <StatTile label="À coter" value={s.PENDING_ASSIGNMENT ?? 0} sub="action SDAG" tone="action" />
        <StatTile label="En traitement" value={s.ASSIGNED ?? 0} sub={`${o?.agentLoad.length ?? 0} agent(s)`} tone="progress" />
        <StatTile
          label="En retard"
          value={o?.overdue ?? '-'}
          sub={o?.overdue === null ? 'délais non configurés' : 'au-delà de la cible'}
          tone={o?.overdue ? 'danger' : 'neutral'}
        />
        <StatTile
          label="Terminées"
          value={signed + stopped}
          sub={`${signed} signée(s) · ${stopped} arrêtée(s)`}
          tone="success"
        />
      </Box>

      <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>Circuit des demandes</Typography>
        <Typography sx={{ fontSize: 11.5, color: '#5D6D7E', mb: 2 }}>
          Où se trouvent les dossiers de l'exercice
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto', pb: 1 }}>
          <Step count={o?.total ?? 0} label="Soumises" tone="neutral" />
          <Arrow />
          <Step count={s.PENDING_MANAGER_REVIEW ?? 0} label="Attente d'avis" tone="progress" />
          <Arrow />
          <Step count={s.PENDING_ASSIGNMENT ?? 0} label="À coter" tone="action" />
          <Arrow />
          <Step count={s.ASSIGNED ?? 0} label="En traitement" tone="progress" />
          <Arrow />
          <Step count={signed} label="Signées" tone="success" />
        </Box>
        {stopped > 0 && (
          <Box
            sx={{
              mt: 1.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: TONE_COLORS.danger.soft,
              border: `1px solid ${TONE_COLORS.danger.main}33`,
              borderRadius: 1.5,
              px: 1.5,
              py: 0.8,
            }}
          >
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: TONE_COLORS.danger.text }}>
              {stopped} dossier(s) arrêté(s)
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: '#5D6D7E' }}>
              avis défavorable ou rejet en traitement
            </Typography>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>Activité mensuelle</Typography>
        <Typography sx={{ fontSize: 11.5, color: '#5D6D7E', mb: 1 }}>
          Demandes reçues et demandes clôturées · exercice {o?.year ?? year}
        </Typography>
        {o && <ActivityChart data={o.monthly} />}
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>Délais de traitement</Typography>
          <Typography sx={{ fontSize: 11.5, color: '#5D6D7E', mb: 1.5 }}>
            Moyennes sur {o?.delays.decidedCount ?? 0} dossier(s) clôturé(s)
          </Typography>
          <Stack spacing={1}>
            {[
              { l: 'Moyen total', v: delay(o?.delays.total) },
              { l: 'Avis hiérarchique', v: delay(o?.delays.hierarchy) },
              { l: 'Cotation SDAG', v: delay(o?.delays.assignment) },
              { l: 'Traitement', v: delay(o?.delays.treatment) },
              { l: 'Dans le délai', v: o?.onTimeShare === null || o?.onTimeShare === undefined ? '-' : `${o.onTimeShare} %` },
            ].map((r) => (
              <Box key={r.l} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 12.5, color: '#5D6D7E' }}>{r.l}</Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#1B4F72' }}>{r.v}</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>Par type de demande</Typography>
          <Typography sx={{ fontSize: 11.5, color: '#5D6D7E', mb: 1.5 }}>
            Demandes transmises · exercice {o?.year ?? year}
          </Typography>
          <Stack spacing={1.2}>
            {typeRows.map((r) => (
              <BarRow key={r.t} label={REQUEST_TYPE_LABELS[r.t]} value={r.v} max={typeMax} color="#7FB3D5" />
            ))}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>Charge des agents</Typography>
          <Typography sx={{ fontSize: 11.5, color: '#5D6D7E', mb: 1.5 }}>Dossiers actuellement détenus</Typography>
          {(o?.agentLoad.length ?? 0) === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: '#5D6D7E' }}>Aucun dossier en traitement.</Typography>
          ) : (
            <Stack spacing={1.2}>
              {o?.agentLoad.map((a) => (
                <BarRow key={a.employeeId} label={a.name} value={a.count} max={loadMax} color="#5DADE2" />
              ))}
            </Stack>
          )}
          {o && (
            <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #f0f1f3', display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 11.5, color: TONE_COLORS.success.text }}>
                Avis favorables · {o.opinions.favourable}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: TONE_COLORS.danger.text }}>
                Défavorables · {o.opinions.unfavourable}
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {mine.length > 0 && (
        <Paper sx={{ borderRadius: 2, mt: 1.5 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #f0f1f3', display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>En attente de votre avis</Typography>
            <Button component={RouterLink} to="/manager" size="small">
              Voir tout →
            </Button>
          </Box>
          <Stack divider={<Box sx={{ borderBottom: '1px solid #f5f6fa' }} />}>
            {mine.map((r) => (
              <Box
                key={r.id}
                component={RouterLink}
                to={`/requests/${r.id}`}
                sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit', '&:hover': { bgcolor: '#FAFBFC' } }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 11, color: '#5D6D7E', fontFamily: 'monospace' }}>{r.reference}</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                    {r.employee.firstName} {r.employee.lastName} · {REQUEST_TYPE_LABELS[r.type]}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>
                    {formatDate(r.startDate)} → {formatDate(r.endDate)}
                  </Typography>
                </Box>
                <StatusBadge status={r.status} request={r} user={user} />
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      <EmployeeHistoryPanel />
    </Box>
  );
}

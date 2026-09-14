import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Autocomplete,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { Link as RouterLink } from 'react-router-dom';
import { listEmployees } from '../api/misc';
import { employeeHistoryDocumentUrl, fetchEmployeeHistory } from '../api/requests';
import { StatusBadge } from '../components/StatusBadge';
import { REQUEST_TYPE_LABELS, formatDate } from '../types/labels';
import type { Employee, RequestType } from '../types/api';

// Consultation en lecture seule de l'historique d'un agent : on le cherche par
// nom ou matricule, on filtre par exercice et/ou nature, et la fiche
// imprimable reprend exactement le périmètre affiché.
export function EmployeeHistoryPanel() {
  const [selected, setSelected] = useState<Employee | null>(null);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [type, setType] = useState<RequestType | ''>('');

  // La recherche ne part qu'à partir de 2 caractères : au-delà d'une centaine
  // d'agents, lister tout le monde à chaque frappe n'a pas de sens.
  const { data: employees, isFetching } = useQuery({
    queryKey: ['employees', 'history-picker', search],
    queryFn: () => listEmployees({ search }),
    enabled: search.trim().length >= 2,
  });

  const filters = { year: year || undefined, type: type || undefined };
  const { data: history, isLoading } = useQuery({
    queryKey: ['employee-history', selected?.id, year, type],
    queryFn: () => fetchEmployeeHistory(selected!.id, filters),
    enabled: !!selected,
  });

  return (
    <Paper sx={{ borderRadius: 2, mt: 1.5 }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #f0f1f3' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>
          Historique par agent
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: '#5D6D7E', mt: 0.3 }}>
          Recherchez un agent par son nom ou son matricule pour consulter ses demandes.
        </Typography>
      </Box>

      <Box sx={{ p: 2.5 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { md: 'center' }, mb: selected ? 2.5 : 0 }}
        >
          <Autocomplete
            sx={{ flex: 1, minWidth: 260 }}
            size="small"
            options={employees?.items ?? []}
            value={selected}
            onChange={(_, v) => setSelected(v)}
            onInputChange={(_, v) => setSearch(v)}
            loading={isFetching}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            getOptionLabel={(e) => `${e.firstName} ${e.lastName} — ${e.matricule}`}
            noOptionsText={
              search.trim().length < 2 ? 'Saisissez au moins 2 caractères…' : 'Aucun agent trouvé.'
            }
            renderInput={(params) => <TextField {...params} label="Agent (nom ou matricule)" />}
          />

          {selected && (
            <>
              <TextField
                select
                size="small"
                label="Exercice"
                value={year}
                onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">Tous</MenuItem>
                {history?.availableYears.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Nature"
                value={type}
                onChange={(e) => setType(e.target.value as RequestType | '')}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="">Toutes</MenuItem>
                {(Object.keys(REQUEST_TYPE_LABELS) as RequestType[]).map((t) => (
                  <MenuItem key={t} value={t}>
                    {REQUEST_TYPE_LABELS[t]}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                component="a"
                href={employeeHistoryDocumentUrl(selected.id, filters)}
                target="_blank"
                rel="noreferrer"
                size="small"
                variant="outlined"
                startIcon={<DescriptionIcon />}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Éditer la fiche
              </Button>
            </>
          )}
        </Stack>

        {!selected && (
          <Typography sx={{ fontSize: 13, color: '#5D6D7E', mt: 2 }}>
            Aucun agent sélectionné.
          </Typography>
        )}

        {selected && isLoading && <Typography sx={{ fontSize: 13 }}>Chargement…</Typography>}

        {selected && history && (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1B4F72' }}>
                {history.employee.firstName} {history.employee.lastName}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#5D6D7E' }}>
                {history.employee.matricule} · {history.employee.position}
                {history.employee.organizationUnit ? ` · ${history.employee.organizationUnit.name}` : ''}
              </Typography>
            </Box>

            {history.totals.length > 0 && (
              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}
              >
                {history.totals.map((t) => (
                  <Box
                    key={t.type}
                    sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: '#F7F9FB', minWidth: 160 }}
                  >
                    <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>
                      {REQUEST_TYPE_LABELS[t.type]}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>
                      {t.count} demande(s)
                      {t.approvedDays > 0 ? ` · ${t.approvedDays} j accordé(s)` : ''}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}

            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 11.5, color: '#5D6D7E' }}>Référence</TableCell>
                    <TableCell sx={{ fontSize: 11.5, color: '#5D6D7E' }}>Nature</TableCell>
                    <TableCell sx={{ fontSize: 11.5, color: '#5D6D7E' }}>Période</TableCell>
                    <TableCell sx={{ fontSize: 11.5, color: '#5D6D7E' }}>Durée</TableCell>
                    <TableCell sx={{ fontSize: 11.5, color: '#5D6D7E' }}>Statut</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ fontSize: 13, color: '#5D6D7E' }}>
                        Aucune demande sur ce périmètre.
                      </TableCell>
                    </TableRow>
                  )}
                  {history.items.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontSize: 11.5, fontFamily: 'monospace' }}>
                        {r.reference ?? '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{REQUEST_TYPE_LABELS[r.type]}</TableCell>
                      <TableCell sx={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                        {r.type === 'ATTESTATION_PRESENCE'
                          ? formatDate(r.startDate)
                          : `${formatDate(r.startDate)} → ${formatDate(r.endDate)}`}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>
                        {r.calculatedDays ? `${r.calculatedDays} j` : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell align="right">
                        <Button component={RouterLink} to={`/requests/${r.id}`} size="small">
                          Détail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>
    </Paper>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Autocomplete,
  Box,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
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
// nom ou matricule, on filtre par exercice et/ou type, et la fiche
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
    <Paper sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2.5, pb: 1.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>Historique par agent</Typography>
        <Typography sx={{ fontSize: 11.5, color: '#5D6D7E', mt: 0.3, mb: 2 }}>
          Recherchez un agent par son nom ou son matricule
        </Typography>

        <Autocomplete
          fullWidth
          size="small"
          options={employees?.items ?? []}
          value={selected}
          onChange={(_, v) => setSelected(v)}
          // Même précaution qu'ailleurs : ne relancer la recherche qu'à la
          // frappe, pas à la sélection.
          onInputChange={(_, v, reason) => {
            if (reason === 'input') setSearch(v);
          }}
          loading={isFetching}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          getOptionLabel={(e) => `${e.firstName} ${e.lastName} - ${e.matricule}`}
          noOptionsText={
            search.trim().length < 2 ? 'Saisissez au moins 2 caractères…' : 'Aucun agent trouvé.'
          }
          renderInput={(params) => <TextField {...params} label="Agent" />}
        />

        {selected && (
          <>
            {/* Filtres et édition de la fiche sur une seule ligne, sous la
                recherche : en colonne, les empiler ferait descendre la liste
                trop bas. */}
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center' }}>
              <TextField
                select
                size="small"
                label="Exercice"
                value={year}
                onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}
                sx={{ width: 110 }}
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
                label="Type"
                value={type}
                onChange={(e) => setType(e.target.value as RequestType | '')}
                sx={{ flex: 1, minWidth: 0 }}
              >
                <MenuItem value="">Tous</MenuItem>
                {(Object.keys(REQUEST_TYPE_LABELS) as RequestType[]).map((t) => (
                  <MenuItem key={t} value={t}>
                    {REQUEST_TYPE_LABELS[t]}
                  </MenuItem>
                ))}
              </TextField>
              <Tooltip title="Éditer la fiche d'historique">
                <IconButton
                  component="a"
                  href={employeeHistoryDocumentUrl(selected.id, filters)}
                  target="_blank"
                  rel="noreferrer"
                  size="small"
                  sx={{ border: '1px solid #E0E4E8', borderRadius: 1.5 }}
                >
                  <DescriptionIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>

            {history && (
              <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>
                  {history.employee.firstName} {history.employee.lastName}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: '#5D6D7E' }}>
                  {history.employee.matricule} · {history.employee.position}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Zone déroulante : la carte garde la même hauteur que le graphique
          voisin, quel que soit le nombre de demandes. */}
      <Box sx={{ flex: 1, minHeight: 190, maxHeight: 300, overflowY: 'auto', px: 2.5, pb: 2 }}>
        {!selected && (
          <Typography sx={{ fontSize: 12.5, color: '#5D6D7E' }}>Aucun agent sélectionné.</Typography>
        )}
        {selected && isLoading && <Typography sx={{ fontSize: 12.5 }}>Chargement…</Typography>}

        {selected && history && (
          <>
            {history.totals.length > 0 && (
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.8, mb: 1.5 }}>
                {history.totals.map((t) => (
                  <Box key={t.type} sx={{ px: 1.2, py: 0.6, borderRadius: 1.5, bgcolor: '#F7F9FB' }}>
                    <Typography sx={{ fontSize: 10.5, color: '#5D6D7E' }}>
                      {REQUEST_TYPE_LABELS[t.type]}
                    </Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1B4F72' }}>
                      {t.count} demande(s)
                      {t.approvedDays > 0 ? ` · ${t.approvedDays} j` : ''}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}

            {history.items.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: '#5D6D7E' }}>
                Aucune demande sur ce périmètre.
              </Typography>
            ) : (
              /* Liste plutôt que tableau : six colonnes ne tiennent pas dans
                 une demi-largeur sans devenir illisibles. */
              <Stack divider={<Box sx={{ borderBottom: '1px solid #F5F6FA' }} />}>
                {history.items.map((r) => (
                  <Box
                    key={r.id}
                    component={RouterLink}
                    to={`/requests/${r.id}`}
                    sx={{
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      textDecoration: 'none',
                      color: 'inherit',
                      '&:hover': { bgcolor: '#FAFBFC' },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 10.5, color: '#5D6D7E', fontFamily: 'monospace' }}>
                        {r.reference ?? '-'}
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 500 }} noWrap>
                        {REQUEST_TYPE_LABELS[r.type]}
                        {r.calculatedDays ? ` · ${r.calculatedDays} j` : ''}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: '#5D6D7E' }} noWrap>
                        {r.type === 'ATTESTATION_PRESENCE'
                          ? formatDate(r.startDate)
                          : `${formatDate(r.startDate)} → ${formatDate(r.endDate)}`}
                      </Typography>
                    </Box>
                    <StatusBadge status={r.status} />
                  </Box>
                ))}
              </Stack>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchRequestsOverview, listRequests } from '../api/requests';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { EmployeeHistoryPanel } from './EmployeeHistoryPanel';
import { REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS, formatDate } from '../types/labels';
import type { RequestStatus, RequestType } from '../types/api';

// Une ligne « libellé — barre — valeur ». Pas de librairie de graphiques :
// une simple barre proportionnelle suffit et reste dans le ton de l'interface.
function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Typography sx={{ fontSize: 12.5, color: '#5D6D7E', flex: '0 0 46%' }}>{label}</Typography>
      <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F2F4F7', overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color, borderRadius: 3 }} />
      </Box>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#1B4F72', flex: '0 0 28px', textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  );
}

// Ordre de lecture du circuit. RETURNED_TO_SDAG_DIRECTOR n'apparaît que s'il
// reste des dossiers de l'ancien circuit.
const CIRCUIT_STATUSES: { status: RequestStatus; color: string }[] = [
  { status: 'PENDING_MANAGER_REVIEW', color: '#5DADE2' },
  { status: 'PENDING_ASSIGNMENT', color: '#5DADE2' },
  { status: 'ASSIGNED', color: '#5DADE2' },
  { status: 'RETURNED_TO_SDAG_DIRECTOR', color: '#5DADE2' },
  { status: 'APPROVED', color: '#58D68D' },
  { status: 'REJECTED', color: '#EC7063' },
  { status: 'MANAGER_REJECTED', color: '#EC7063' },
];

// Vue d'ensemble du circuit, en lecture seule. C'est le tableau de bord du
// Directeur Général, et la même page est ouverte au Sous-Directeur SDAG et à
// l'administration. Aucune action d'écriture n'y figure : celles de
// l'administration restent sur ses propres écrans.
export function OverviewPage({ showHeading = true }: { showHeading?: boolean }) {
  const { user } = useAuth();

  const { data: overview } = useQuery({
    queryKey: ['requests', 'overview'],
    queryFn: () => fetchRequestsOverview(),
  });
  const { data: pending } = useQuery({
    queryKey: ['requests', 'overview-pending'],
    queryFn: () => listRequests({ status: 'PENDING_MANAGER_REVIEW', page: 1, pageSize: 50 }),
  });

  // Ces comptes voient l'ensemble des demandes soumises ; on ne retient ici
  // que celles dont l'utilisateur est effectivement le supérieur hiérarchique.
  const mine = pending?.items.filter((r) => r.employee.managerId === user?.employeeId) ?? [];

  const statusRows = CIRCUIT_STATUSES.map((row) => ({
    ...row,
    value: overview?.byStatus[row.status] ?? 0,
  })).filter((row) => row.status !== 'RETURNED_TO_SDAG_DIRECTOR' || row.value > 0);
  const statusMax = Math.max(1, ...statusRows.map((r) => r.value));

  const typeRows = (Object.keys(REQUEST_TYPE_LABELS) as RequestType[])
    .map((type) => ({ type, value: overview?.byType[type] ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const typeMax = Math.max(1, ...typeRows.map((r) => r.value));

  return (
    <Box>
      {showHeading && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72' }}>Vue d'ensemble</Typography>
          <Typography sx={{ fontSize: 13, color: '#5D6D7E' }}>
            Ensemble des demandes de la Direction Générale du Budget · consultation
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5, mb: 3 }}>
        <StatCard
          label="En attente de votre avis"
          value={overview?.awaitingMyReview ?? 0}
          sub="demandes à arbitrer"
          subColor={overview?.awaitingMyReview ? '#D35400' : undefined}
        />
        <StatCard label="En circuit" value={overview?.inCircuit ?? 0} sub="dossiers en cours" />
        <StatCard label="Validées" value={overview?.byStatus.APPROVED ?? 0} sub={`exercice ${overview?.year ?? ''}`} />
        <StatCard label="Total transmis" value={overview?.total ?? 0} sub={`exercice ${overview?.year ?? ''}`} />
      </Box>

      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #f0f1f3', display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>En attente de votre avis</Typography>
          <Button component={RouterLink} to="/manager" size="small">
            Voir tout →
          </Button>
        </Box>
        <Stack divider={<Box sx={{ borderBottom: '1px solid #f5f6fa' }} />}>
          {mine.length === 0 && (
            <Typography sx={{ p: 2, fontSize: 13, color: '#5D6D7E' }}>
              Aucune demande n'attend votre avis.
            </Typography>
          )}
          {mine.map((r) => (
            <Box
              key={r.id}
              component={RouterLink}
              to={`/requests/${r.id}`}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                textDecoration: 'none',
                color: 'inherit',
                '&:hover': { bgcolor: '#FAFBFC' },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 11, color: '#5D6D7E', fontFamily: 'monospace' }}>{r.reference}</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                  {r.employee.firstName} {r.employee.lastName} · {REQUEST_TYPE_LABELS[r.type]}
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>
                  {formatDate(r.startDate)} → {formatDate(r.endDate)}
                  {r.calculatedDays ? ` · ${r.calculatedDays} jour(s)` : ''}
                </Typography>
              </Box>
              <StatusBadge status={r.status} />
            </Box>
          ))}
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72', mb: 0.3 }}>
            Où en sont les demandes
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: '#5D6D7E', mb: 2 }}>
            Ensemble de la Direction Générale · exercice {overview?.year ?? ''}
          </Typography>
          <Stack spacing={1.5}>
            {statusRows.map((row) => (
              <BarRow
                key={row.status}
                label={REQUEST_STATUS_LABELS[row.status]}
                value={row.value}
                max={statusMax}
                color={row.color}
              />
            ))}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72', mb: 0.3 }}>
            Par nature de demande
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: '#5D6D7E', mb: 2 }}>
            Demandes transmises · exercice {overview?.year ?? ''}
          </Typography>
          <Stack spacing={1.5}>
            {typeRows.map((row) => (
              <BarRow
                key={row.type}
                label={REQUEST_TYPE_LABELS[row.type]}
                value={row.value}
                max={typeMax}
                color="#7FB3D5"
              />
            ))}
          </Stack>
        </Paper>
      </Box>

      <EmployeeHistoryPanel />
    </Box>
  );
}

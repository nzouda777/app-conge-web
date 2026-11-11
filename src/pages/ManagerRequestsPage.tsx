import { useQuery } from '@tanstack/react-query';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { listRequests } from '../api/requests';
import { StatusBadge } from '../components/StatusBadge';
import { REQUEST_TYPE_LABELS, formatDate } from '../types/labels';
import { tokens } from '../theme/tokens';

export function ManagerRequestsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['requests', 'manager-all'],
    queryFn: () => listRequests({ pageSize: 50 }),
  });

  // Cette page ne montre que l'équipe : les demandes dont l'utilisateur est le
  // supérieur hiérarchique. On écarte donc ses propres demandes, et — pour le
  // Directeur Général et la SDAG, qui voient l'ensemble du circuit — tous les
  // dossiers sur lesquels ils n'ont pas d'avis à rendre.
  const team = data?.items.filter((r) => r.employee.managerId === user?.employeeId) ?? [];
  const pending = team.filter((r) => r.status === 'PENDING_MANAGER_REVIEW');
  const others = team.filter((r) => r.status !== 'PENDING_MANAGER_REVIEW');

  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: tokens.brand, mb: 0.5 }}>
        Demandes de mon équipe
      </Typography>
      <Typography sx={{ fontSize: 14, color: tokens.inkSecondary, mb: 3 }}>
        {pending.length} demande(s) en attente de votre avis
      </Typography>

      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: `1px solid ${tokens.borderSoft}` }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: tokens.brand }}>En attente d'avis</Typography>
        </Box>
        <Stack divider={<Box sx={{ borderBottom: `1px solid ${tokens.appBackground}` }} />}>
          {isLoading && <Typography sx={{ p: 2, fontSize: 14 }}>Chargement…</Typography>}
          {pending.length === 0 && !isLoading && (
            <Typography sx={{ p: 2, fontSize: 14, color: tokens.inkSecondary }}>Aucune demande en attente.</Typography>
          )}
          {pending.map((r) => (
            <Box key={r.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 13, color: tokens.inkSecondary, fontFamily: 'monospace' }}>
                  {r.reference}
                </Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                  {r.employee.firstName} {r.employee.lastName} - {REQUEST_TYPE_LABELS[r.type]}
                </Typography>
                <Typography sx={{ fontSize: 13, color: tokens.inkSecondary }}>
                  {formatDate(r.startDate)} → {formatDate(r.endDate)} · {r.calculatedDays} jour(s)
                </Typography>
              </Box>
              <Button component={RouterLink} to={`/requests/${r.id}`} variant="contained" size="small">
                Examiner
              </Button>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: `1px solid ${tokens.borderSoft}` }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: tokens.brand }}>Historique de l'équipe</Typography>
        </Box>
        <Stack divider={<Box sx={{ borderBottom: `1px solid ${tokens.appBackground}` }} />}>
          {others.map((r) => (
            <Box
              key={r.id}
              component={RouterLink}
              to={`/requests/${r.id}`}
              sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 14 }}>
                  {r.employee.firstName} {r.employee.lastName} - {REQUEST_TYPE_LABELS[r.type]}
                </Typography>
                <Typography sx={{ fontSize: 13, color: tokens.inkSecondary }}>
                  {formatDate(r.startDate)} → {formatDate(r.endDate)}
                </Typography>
              </Box>
              <StatusBadge status={r.status} request={r} user={user} />
            </Box>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}

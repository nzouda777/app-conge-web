import { useQuery } from '@tanstack/react-query';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { listRequests } from '../api/requests';
import { StatusBadge } from '../components/StatusBadge';
import { REQUEST_TYPE_LABELS, formatDate } from '../types/labels';

export function ManagerRequestsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['requests', 'manager-all'],
    queryFn: () => listRequests({ pageSize: 50 }),
  });

  const pending = data?.items.filter((r) => r.status === 'PENDING_MANAGER_REVIEW') ?? [];
  const others = data?.items.filter((r) => r.status !== 'PENDING_MANAGER_REVIEW') ?? [];

  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72', mb: 0.5 }}>
        Demandes de mon équipe
      </Typography>
      <Typography sx={{ fontSize: 13, color: '#5D6D7E', mb: 3 }}>
        {pending.length} demande(s) en attente de votre avis
      </Typography>

      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #f0f1f3' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>En attente d'avis</Typography>
        </Box>
        <Stack divider={<Box sx={{ borderBottom: '1px solid #f5f6fa' }} />}>
          {isLoading && <Typography sx={{ p: 2, fontSize: 13 }}>Chargement…</Typography>}
          {pending.length === 0 && !isLoading && (
            <Typography sx={{ p: 2, fontSize: 13, color: '#5D6D7E' }}>Aucune demande en attente.</Typography>
          )}
          {pending.map((r) => (
            <Box key={r.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 11, color: '#5D6D7E', fontFamily: 'monospace' }}>
                  {r.reference}
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                  {r.employee.firstName} {r.employee.lastName} — {REQUEST_TYPE_LABELS[r.type]}
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>
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
        <Box sx={{ p: 2, borderBottom: '1px solid #f0f1f3' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>Historique de l'équipe</Typography>
        </Box>
        <Stack divider={<Box sx={{ borderBottom: '1px solid #f5f6fa' }} />}>
          {others.map((r) => (
            <Box
              key={r.id}
              component={RouterLink}
              to={`/requests/${r.id}`}
              sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 13 }}>
                  {r.employee.firstName} {r.employee.lastName} — {REQUEST_TYPE_LABELS[r.type]}
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>
                  {formatDate(r.startDate)} → {formatDate(r.endDate)}
                </Typography>
              </Box>
              <StatusBadge status={r.status} />
            </Box>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}

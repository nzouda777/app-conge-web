import { useQuery } from '@tanstack/react-query';
import { Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchQuotaSummary } from '../api/misc';
import { listRequests } from '../api/requests';
import { listSdagRequests } from '../api/sdag';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { REQUEST_TYPE_LABELS, formatDate } from '../types/labels';

export function DashboardPage() {
  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';
  const isManager = user?.role === 'RESPONSABLE_HIERARCHIQUE';
  const isSdag = user?.role === 'SOUS_DIRECTEUR_SDAG' || user?.role === 'AGENT_TRAITEMENT_SDAG';

  const { data: quota } = useQuery({ queryKey: ['quota'], queryFn: () => fetchQuotaSummary() });
  const { data: myRequests } = useQuery({
    queryKey: ['requests', 'recent'],
    queryFn: () => listRequests({ page: 1, pageSize: 5 }),
  });
  const { data: managerQueue } = useQuery({
    queryKey: ['requests', 'manager-queue'],
    queryFn: () => listRequests({ status: 'PENDING_MANAGER_REVIEW', page: 1, pageSize: 1 }),
    enabled: isManager,
  });
  const { data: sdagQueue } = useQuery({
    queryKey: ['sdag', 'queue-count'],
    queryFn: () => listSdagRequests({ page: 1, pageSize: 1 }),
    enabled: isSdag,
  });

  const available = quota?.congeAnnuel.availableDays ?? 0;
  const entitlement = quota?.congeAnnuel.entitlementDays ?? 1;
  const consumedPct = quota ? Math.round(((entitlement - available) / entitlement) * 100) : 0;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72' }}>
          Bonjour, {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.email}
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#5D6D7E' }}>
          {user?.employee?.organizationUnit?.name}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5, mb: 3 }}>
        <StatCard
          label="Congé annuel"
          value={
            <>
              {available} <Typography component="span" sx={{ fontSize: 14, color: '#5D6D7E' }}>/ {entitlement}j</Typography>
            </>
          }
          sub={`${consumedPct}% consommés`}
          subColor="#F39C12"
        />
        <StatCard label="Jours en attente" value={quota?.congeAnnuel.pendingDays ?? 0} sub="demandes en cours" />
        <StatCard label="Jours utilisés (année)" value={quota?.congeAnnuel.usedDays ?? 0} sub="congé annuel" />
        {isManager && (
          <StatCard
            label="À examiner"
            value={managerQueue?.total ?? 0}
            sub="demandes en attente d'avis"
            subColor="#D35400"
          />
        )}
        {isSdag && (
          <StatCard label="File SDAG" value={sdagQueue?.total ?? 0} sub="dossiers à traiter" subColor="#D35400" />
        )}
      </Box>

      {quota && (
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72', mb: 1 }}>
            Solde congé annuel {quota.year}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, consumedPct)}
            sx={{ height: 8, borderRadius: 4, mb: 1 }}
          />
          <Typography sx={{ fontSize: 12, color: '#5D6D7E' }}>
            {quota.congeAnnuel.usedDays}j utilisés · {quota.congeAnnuel.pendingDays}j en attente de décision ·{' '}
            {available}j disponibles sur {entitlement}j
          </Typography>
        </Paper>
      )}

      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #f0f1f3', display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>Demandes récentes</Typography>
          <Button component={RouterLink} to="/requests" size="small">
            Voir tout →
          </Button>
        </Box>
        <Stack divider={<Box sx={{ borderBottom: '1px solid #f5f6fa' }} />}>
          {myRequests?.items.length === 0 && (
            <Typography sx={{ p: 2, fontSize: 13, color: '#5D6D7E' }}>Aucune demande pour le moment.</Typography>
          )}
          {myRequests?.items.map((r) => (
            <Box key={r.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 11, color: '#5D6D7E', fontFamily: 'monospace' }}>
                  {r.reference ?? 'Brouillon'}
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{REQUEST_TYPE_LABELS[r.type]}</Typography>
                <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>
                  {formatDate(r.startDate)} → {formatDate(r.endDate)}
                </Typography>
              </Box>
              {r.calculatedDays !== null && (
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1B4F72' }}>
                  {r.calculatedDays} jour(s)
                </Typography>
              )}
              <StatusBadge status={r.status} />
            </Box>
          ))}
        </Stack>
      </Paper>

      {isAgent && (
        <Button component={RouterLink} to="/requests/new" variant="contained" sx={{ mt: 3 }}>
          + Nouvelle demande
        </Button>
      )}
    </Box>
  );
}

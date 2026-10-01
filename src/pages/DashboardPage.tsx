import { useQuery } from '@tanstack/react-query';
import { Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchQuotaSummary } from '../api/misc';
import { listRequests } from '../api/requests';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { Greeting } from '../components/Greeting';
import { OverviewPage } from './OverviewPage';
import { REQUEST_TYPE_LABELS, formatDate } from '../types/labels';

export function DashboardPage() {
  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';

  const isDirecteurGeneral = user?.role === 'DIRECTEUR_GENERAL';

  const { data: quota } = useQuery({
    queryKey: ['quota'],
    queryFn: () => fetchQuotaSummary(),
    enabled: !isDirecteurGeneral,
  });
  const { data: myRequests } = useQuery({
    queryKey: ['requests', 'recent'],
    queryFn: () => listRequests({ page: 1, pageSize: 5 }),
    enabled: !isDirecteurGeneral,
  });

  // Le Directeur Général ne dépose pas de demande : son tableau de bord est
  // la vue d'ensemble du circuit, précédée de l'accueil nominatif.
  if (isDirecteurGeneral) {
    return (
      <>
        <Greeting user={user} />
        <OverviewPage showHeading={false} />
      </>
    );
  }

  const available = quota?.congeAnnuel.availableDays ?? 0;
  const perm = quota?.permissionsMotivees;
  const entitlement = quota?.congeAnnuel.entitlementDays ?? 1;
  const consumedPct = quota ? Math.round(((entitlement - available) / entitlement) * 100) : 0;

  return (
    <Box>
      <Greeting user={user} />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5, mb: 3 }}>
        {/* Ce qui reste à l'agent, et non ce qu'il a déjà consommé : c'est ce
            solde qui conditionne sa prochaine demande. */}
        <StatCard
          label="Congé annuel disponible"
          value={
            <>
              {available}{' '}
              <Typography component="span" sx={{ fontSize: 14, color: '#5D6D7E' }}>
                / {entitlement}j
              </Typography>
            </>
          }
          sub={`${consumedPct}% consommés`}
          subColor={available <= 0 ? '#C0392B' : '#5D6D7E'}
        />
        {/* Les permissions motivées sont les seules plafonnées : mariage,
            décès et paternité gardent leur durée légale et n'entament pas ce
            solde, exactement comme la règle appliquée au dépôt. */}
        <StatCard
          label="Permissions ce mois"
          value={
            <>
              {perm?.remainingThisMonth ?? 0}{' '}
              <Typography component="span" sx={{ fontSize: 14, color: '#5D6D7E' }}>
                / {perm?.monthlyCapDays ?? 3}j
              </Typography>
            </>
          }
          sub="permissions motivées restantes"
          subColor={perm && perm.remainingThisMonth <= 0 ? '#C0392B' : '#5D6D7E'}
        />
        <StatCard
          label="Permissions cette année"
          value={
            <>
              {perm?.remainingThisYear ?? 0}{' '}
              <Typography component="span" sx={{ fontSize: 14, color: '#5D6D7E' }}>
                / {perm?.annualCapDays ?? 10}j
              </Typography>
            </>
          }
          sub="permissions motivées restantes"
          subColor={perm && perm.remainingThisYear <= 0 ? '#C0392B' : '#5D6D7E'}
        />
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
              <StatusBadge status={r.status} request={r} user={user} />
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

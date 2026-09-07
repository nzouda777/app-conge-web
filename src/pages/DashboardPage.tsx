import { useQuery } from '@tanstack/react-query';
import { Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchQuotaSummary } from '../api/misc';
import { fetchRequestsOverview, listRequests } from '../api/requests';
import { listSdagRequests } from '../api/sdag';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import {
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
  formatDate,
} from '../types/labels';
import type { AuthUser, RequestStatus, RequestType } from '../types/api';

// Un en-tête commun aux deux tableaux de bord.
function Greeting({ user }: { user: AuthUser | null }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72' }}>
        Bonjour, {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.email}
      </Typography>
      <Typography sx={{ fontSize: 13, color: '#5D6D7E' }}>
        {user?.employee?.organizationUnit?.name}
      </Typography>
    </Box>
  );
}

// Une ligne « libellé — barre — valeur ». Pas de librairie de graphiques :
// une simple barre proportionnelle suffit et reste dans le ton de l'interface.
function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
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

// Le Directeur Général ne dépose pas de demande : lui montrer un solde de
// congé n'aurait aucun sens. Son tableau de bord porte donc sur ce qu'il a à
// arbitrer, puis sur l'état d'ensemble du circuit.
function DirectorGeneralDashboard({ user }: { user: AuthUser | null }) {
  const { data: overview } = useQuery({
    queryKey: ['requests', 'overview'],
    queryFn: () => fetchRequestsOverview(),
  });
  const { data: pending } = useQuery({
    queryKey: ['requests', 'dg-pending'],
    queryFn: () => listRequests({ status: 'PENDING_MANAGER_REVIEW', page: 1, pageSize: 50 }),
  });

  // Le DG voit toutes les demandes soumises ; on ne retient ici que celles
  // dont il est effectivement le supérieur hiérarchique.
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
      <Greeting user={user} />

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
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>
            En attente de votre avis
          </Typography>
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
                <Typography sx={{ fontSize: 11, color: '#5D6D7E', fontFamily: 'monospace' }}>
                  {r.reference}
                </Typography>
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
    </Box>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';
  // Anyone with people reporting to them has requests to review.
  const isManager = !!user?.hasSubordinates;
  const isSdag = user?.role === 'SOUS_DIRECTEUR_SDAG' || user?.role === 'AGENT_TRAITEMENT_SDAG';

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
  const { data: managerQueue } = useQuery({
    queryKey: ['requests', 'manager-queue'],
    queryFn: () => listRequests({ status: 'PENDING_MANAGER_REVIEW', page: 1, pageSize: 1 }),
    enabled: isManager && !isDirecteurGeneral,
  });
  const { data: sdagQueue } = useQuery({
    queryKey: ['sdag', 'queue-count'],
    queryFn: () => listSdagRequests({ page: 1, pageSize: 1 }),
    enabled: isSdag,
  });

  // Le Directeur Général ne dépose pas de demande : son tableau de bord est
  // entièrement différent (arbitrages en attente + état du circuit).
  if (isDirecteurGeneral) {
    return <DirectorGeneralDashboard user={user} />;
  }

  const available = quota?.congeAnnuel.availableDays ?? 0;
  const entitlement = quota?.congeAnnuel.entitlementDays ?? 1;
  const consumedPct = quota ? Math.round(((entitlement - available) / entitlement) * 100) : 0;

  return (
    <Box>
      <Greeting user={user} />

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

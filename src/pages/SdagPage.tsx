import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { listSdagRequests } from '../api/sdag';
import { StatusBadge } from '../components/StatusBadge';
import { expectedReviewerLabel } from '../theme/statusColors';
import { REQUEST_TYPE_LABELS, formatDate } from '../types/labels';
import type { RequestStatus } from '../types/api';
import { useAuth } from '../auth/AuthContext';
import { tokens } from '../theme/tokens';

// Les onglets suivent le parcours du dossier : initié chez la hiérarchie,
// reçu à la SDAG, coté, puis son issue. « Rejetées » réunit les deux refus -
// l'avis défavorable d'un supérieur et le rejet par l'agent de traitement.
const TABS: { label: string; statuses?: RequestStatus[] }[] = [
  { label: 'Toutes' },
  { label: 'Initiées', statuses: ['PENDING_MANAGER_REVIEW'] },
  { label: 'À coter', statuses: ['PENDING_ASSIGNMENT'] },
  { label: 'En traitement - SDAG', statuses: ['ASSIGNED'] },
  { label: 'Signées', statuses: ['APPROVED'] },
  { label: 'Rejetées', statuses: ['REJECTED', 'MANAGER_REJECTED'] },
];

export function SdagPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const statuses = TABS[tab].statuses;

  const { data, isLoading } = useQuery({
    queryKey: ['sdag', 'requests', statuses],
    queryFn: () => listSdagRequests({ statuses, pageSize: 50 }),
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: tokens.brand }}>
            SDAG - Réception & Traitement
          </Typography>
          <Typography sx={{ fontSize: 14, color: tokens.inkSecondary }}>
            {user?.role === 'AGENT_TRAITEMENT_SDAG'
              ? 'Dossiers qui vous sont affectés'
              : 'Ensemble des dossiers transmis par les responsables hiérarchiques'}
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: `1px solid ${tokens.borderSoft}`, px: 1 }}>
          {TABS.map((t) => (
            <Tab key={t.label} label={t.label} sx={{ fontSize: 14, textTransform: 'none' }} />
          ))}
        </Tabs>
        <Stack divider={<Box sx={{ borderBottom: `1px solid ${tokens.appBackground}` }} />}>
          {isLoading && <Typography sx={{ p: 2, fontSize: 14 }}>Chargement…</Typography>}
          {data?.items.length === 0 && !isLoading && (
            <Typography sx={{ p: 2, fontSize: 14, color: tokens.inkSecondary }}>Aucun dossier dans cette file.</Typography>
          )}
          {data?.items.map((r) => (
            <Box key={r.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                  <Typography sx={{ fontSize: 13, color: tokens.inkSecondary, fontFamily: 'monospace' }}>
                    {r.reference}
                  </Typography>
                  <StatusBadge status={r.status} request={r} user={user} />
                </Box>
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                  {r.employee.firstName} {r.employee.lastName} - {r.employee.organizationUnit?.name} ·{' '}
                  {REQUEST_TYPE_LABELS[r.type]} · {r.calculatedDays} jour(s)
                </Typography>
                <Typography sx={{ fontSize: 13, color: tokens.inkSecondary }}>
                  {formatDate(r.startDate)} → {formatDate(r.endDate)}
                  {r.currentAssignee ? ` · Coté à ${r.currentAssignee.firstName} ${r.currentAssignee.lastName}` : ''}
                </Typography>
                {/* De qui l'avis est attendu : sans cela, un dossier bloqué ne
                    désigne personne et nul ne sait qui relancer. */}
                {expectedReviewerLabel(r) && (
                  <Typography sx={{ fontSize: 13, color: tokens.warningText }}>
                    En attente de l'avis de : {expectedReviewerLabel(r)}
                  </Typography>
                )}
              </Box>
              <Button component={RouterLink} to={`/requests/${r.id}`} variant="outlined" size="small">
                Détail
              </Button>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}

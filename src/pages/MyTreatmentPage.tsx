import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { listSdagRequests } from '../api/sdag';
import { StatusBadge } from '../components/StatusBadge';
import { REQUEST_TYPE_LABELS, formatDate, formatDateTime } from '../types/labels';
import type { RequestStatus } from '../types/api';

// Les dossiers cotés à l'agent de traitement connecté. Le serveur restreint
// déjà la liste à ceux qui lui sont affectés : cette page n'ouvre aucun accès
// que la vue SDAG n'accordait pas, elle en retire la vue d'ensemble, qui
// relève du Sous-Directeur.
const TABS: { label: string; statuses: RequestStatus[] }[] = [
  { label: 'À traiter', statuses: ['ASSIGNED'] },
  { label: 'Traités', statuses: ['APPROVED', 'REJECTED'] },
];

export function MyTreatmentPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const statuses = TABS[tab].statuses;

  const { data, isLoading } = useQuery({
    queryKey: ['sdag', 'my-treatment', statuses],
    queryFn: () => listSdagRequests({ statuses, pageSize: 50 }),
  });

  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72', mb: 0.5 }}>
        Mes dossiers à traiter
      </Typography>
      <Typography sx={{ fontSize: 13, color: '#5D6D7E', mb: 3 }}>
        Dossiers qui vous ont été cotés par la Sous-Direction des Affaires Générales
      </Typography>

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #e8eaed', px: 1 }}>
          {TABS.map((t) => (
            <Tab key={t.label} label={t.label} sx={{ fontSize: 13, textTransform: 'none' }} />
          ))}
        </Tabs>
        <Stack divider={<Box sx={{ borderBottom: '1px solid #f5f6fa' }} />}>
          {isLoading && <Typography sx={{ p: 2, fontSize: 13 }}>Chargement…</Typography>}
          {data?.items.length === 0 && !isLoading && (
            <Typography sx={{ p: 2, fontSize: 13, color: '#5D6D7E' }}>
              {tab === 0
                ? "Aucun dossier ne vous est coté pour l'instant."
                : "Vous n'avez encore traité aucun dossier."}
            </Typography>
          )}
          {data?.items.map((r) => {
            const assignedAt = r.sdagAssignments?.at(-1)?.createdAt;
            return (
              <Box key={r.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                    <Typography sx={{ fontSize: 11, color: '#5D6D7E', fontFamily: 'monospace' }}>
                      {r.reference}
                    </Typography>
                    <StatusBadge status={r.status} request={r} user={user} />
                  </Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                    {r.employee.firstName} {r.employee.lastName} · {REQUEST_TYPE_LABELS[r.type]}
                    {r.calculatedDays ? ` · ${r.calculatedDays} jour(s)` : ''}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>
                    {formatDate(r.startDate)} → {formatDate(r.endDate)}
                    {assignedAt ? ` · reçu le ${formatDateTime(assignedAt)}` : ''}
                  </Typography>
                </Box>
                <Button component={RouterLink} to={`/requests/${r.id}`} variant="outlined" size="small">
                  Détail
                </Button>
              </Box>
            );
          })}
        </Stack>
      </Paper>
    </Box>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { listSdagRequests } from '../api/sdag';
import { StatusBadge } from '../components/StatusBadge';
import { REQUEST_TYPE_LABELS, formatDate } from '../types/labels';
import type { RequestStatus } from '../types/api';
import { useAuth } from '../auth/AuthContext';

const TABS: { label: string; status?: RequestStatus }[] = [
  { label: 'Toutes' },
  { label: 'À coter', status: 'PENDING_ASSIGNMENT' },
  { label: 'En traitement', status: 'ASSIGNED' },
  { label: 'Retournées (décision)', status: 'RETURNED_TO_SDAG_DIRECTOR' },
  { label: 'Approuvées', status: 'APPROVED' },
  { label: 'Rejetées', status: 'REJECTED' },
];

export function SdagPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const status = TABS[tab].status;

  const { data, isLoading } = useQuery({
    queryKey: ['sdag', 'requests', status],
    queryFn: () => listSdagRequests({ status, pageSize: 50 }),
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72' }}>
            SDAG — Réception & Traitement
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#5D6D7E' }}>
            {user?.role === 'AGENT_TRAITEMENT_SDAG'
              ? 'Dossiers qui vous sont affectés'
              : 'Ensemble des dossiers transmis par les responsables hiérarchiques'}
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #e8eaed', px: 1 }}>
          {TABS.map((t) => (
            <Tab key={t.label} label={t.label} sx={{ fontSize: 13, textTransform: 'none' }} />
          ))}
        </Tabs>
        <Stack divider={<Box sx={{ borderBottom: '1px solid #f5f6fa' }} />}>
          {isLoading && <Typography sx={{ p: 2, fontSize: 13 }}>Chargement…</Typography>}
          {data?.items.length === 0 && !isLoading && (
            <Typography sx={{ p: 2, fontSize: 13, color: '#5D6D7E' }}>Aucun dossier dans cette file.</Typography>
          )}
          {data?.items.map((r) => (
            <Box key={r.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                  <Typography sx={{ fontSize: 11, color: '#5D6D7E', fontFamily: 'monospace' }}>
                    {r.reference}
                  </Typography>
                  <StatusBadge status={r.status} />
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                  {r.employee.firstName} {r.employee.lastName} — {r.employee.organizationUnit?.name} ·{' '}
                  {REQUEST_TYPE_LABELS[r.type]} · {r.calculatedDays} jour(s)
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>
                  {formatDate(r.startDate)} → {formatDate(r.endDate)}
                  {r.currentAssignee ? ` · Coté à ${r.currentAssignee.firstName} ${r.currentAssignee.lastName}` : ''}
                </Typography>
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

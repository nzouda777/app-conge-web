import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { listRequests } from '../api/requests';
import { StatusBadge } from '../components/StatusBadge';
import { REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS, formatDate } from '../types/labels';
import type { RequestStatus, RequestType } from '../types/api';
import { useAuth } from '../auth/AuthContext';

export function MyRequestsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<RequestStatus | ''>('');
  const [type, setType] = useState<RequestType | ''>('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['requests', 'list', status, type, search],
    queryFn: () =>
      listRequests({
        status: status || undefined,
        type: type || undefined,
        search: search || undefined,
        pageSize: 50,
      }),
  });

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72' }}>Mes demandes</Typography>
          <Typography sx={{ fontSize: 13, color: '#5D6D7E' }}>
            {data ? `${data.total} demande(s)` : '…'}
          </Typography>
        </Box>
        {user?.role === 'AGENT' && (
          <Button component={RouterLink} to="/requests/new" variant="contained">
            + Nouvelle demande
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Rechercher par référence…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <TextField
          size="small"
          select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as RequestType | '')}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Tous les types</MenuItem>
          {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          select
          label="Statut"
          value={status}
          onChange={(e) => setStatus(e.target.value as RequestStatus | '')}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">Tous les statuts</MenuItem>
          {Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      <Paper sx={{ borderRadius: 2 }}>
        <Stack divider={<Box sx={{ borderBottom: '1px solid #f5f6fa' }} />}>
          {isLoading && <Typography sx={{ p: 2, fontSize: 13 }}>Chargement…</Typography>}
          {data?.items.length === 0 && (
            <Typography sx={{ p: 2, fontSize: 13, color: '#5D6D7E' }}>Aucune demande trouvée.</Typography>
          )}
          {data?.items.map((r) => (
            <Box
              key={r.id}
              component={RouterLink}
              to={`/requests/${r.id}`}
              data-testid="request-row"
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                textDecoration: 'none',
                color: 'inherit',
                '&:hover': { bgcolor: '#fafbfc' },
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                  <Typography sx={{ fontSize: 11, color: '#5D6D7E', fontFamily: 'monospace' }}>
                    {r.reference ?? 'Brouillon'}
                  </Typography>
                  <StatusBadge status={r.status} />
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                  {REQUEST_TYPE_LABELS[r.type]}
                  {r.calculatedDays !== null ? ` — ${r.calculatedDays} jour(s)` : ''}
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>
                  {formatDate(r.startDate)} → {formatDate(r.endDate)}
                  {user?.role !== 'AGENT' ? ` · ${r.employee.firstName} ${r.employee.lastName}` : ''}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}

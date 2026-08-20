import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { listNotifications, markNotificationRead } from '../api/misc';
import { formatDateTime } from '../types/labels';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['notifications', 'all'], queryFn: () => listNotifications(false) });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <Box sx={{ maxWidth: 700 }}>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72', mb: 2 }}>Notifications</Typography>
      <Paper sx={{ borderRadius: 2 }}>
        <Stack divider={<Box sx={{ borderBottom: '1px solid #f5f6fa' }} />}>
          {data?.length === 0 && <Typography sx={{ p: 2, fontSize: 13, color: '#5D6D7E' }}>Aucune notification.</Typography>}
          {data?.map((n) => (
            <Box
              key={n.id}
              onClick={() => {
                if (!n.readAt) markRead.mutate(n.id);
                if (n.requestId) navigate(`/requests/${n.requestId}`);
              }}
              sx={{
                p: 2,
                cursor: 'pointer',
                bgcolor: n.readAt ? 'transparent' : '#EBF5FB',
                '&:hover': { bgcolor: '#fafbfc' },
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: n.readAt ? 400 : 600 }}>{n.title}</Typography>
              <Typography sx={{ fontSize: 12, color: '#5D6D7E' }}>{n.message}</Typography>
              <Typography sx={{ fontSize: 11, color: '#95A5A6', mt: 0.3 }}>{formatDateTime(n.createdAt)}</Typography>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}

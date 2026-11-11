import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, TablePagination, Typography } from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useNavigate } from 'react-router-dom';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../api/misc';
import { getApiErrorMessage } from '../api/client';
import { formatDateTime } from '../types/labels';
import { tokens } from '../theme/tokens';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // La page n'avait aucun affichage d'erreur ni de chargement : un échec de
  // « tout marquer comme lu » ne disait rien, et une liste qui ne chargeait pas
  // laissait un écran vide indistinguable d'une absence de notifications.
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: listError } = useQuery({
    queryKey: ['notifications', 'all', page, pageSize],
    queryFn: () => listNotifications(false, { page: page + 1, pageSize }),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: invalidate,
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de marquer cette notification comme lue.')),
  });

  // « Tout marquer comme lu » : il fallait auparavant ouvrir chaque
  // notification une par une pour faire disparaître la pastille.
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de marquer les notifications comme lues.')),
  });

  const unread = data?.unread ?? 0;

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, color: tokens.brand }}>
          Notifications
        </Typography>
        {unread > 0 && <Chip label={`${unread} non lue(s)`} color="error" size="small" />}
        <Box sx={{ flex: 1 }} />
        {unread > 0 && (
          <Button
            size="small"
            startIcon={<DoneAllIcon />}
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Tout marquer comme lu
          </Button>
        )}
      </Box>

      {(error || listError) && (
        <Alert severity="error" role="alert" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error ?? getApiErrorMessage(listError, 'Impossible de charger vos notifications.')}
        </Alert>
      )}

      <Paper sx={{ borderRadius: 2 }}>
        <Stack divider={<Box sx={{ borderBottom: `1px solid ${tokens.borderSoft}` }} />}>
          {isLoading && (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={24} aria-label="Chargement des notifications" />
            </Box>
          )}
          {!isLoading && data?.items.length === 0 && (
            <Typography sx={{ p: 3, color: tokens.inkSecondary }}>
              Aucune notification. Vous serez prévenu ici à chaque étape de vos demandes.
            </Typography>
          )}
          {data?.items.map((n) => (
            <Box
              key={n.id}
              // Les notifications sont cliquables : il leur faut un rôle et une
              // prise au clavier, sinon elles sont inatteignables autrement
              // qu'à la souris.
              role="button"
              tabIndex={0}
              aria-label={`${n.title}${n.readAt ? '' : ' — non lue'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).click();
                }
              }}
              onClick={() => {
                if (!n.readAt) markRead.mutate(n.id);
                if (n.requestId) navigate(`/requests/${n.requestId}`);
              }}
              sx={{
                p: 2,
                cursor: 'pointer',
                bgcolor: n.readAt ? 'transparent' : tokens.infoSoft,
                '&:hover': { bgcolor: tokens.surfaceSunk },
                '&:focus-visible': { outline: `3px solid ${tokens.accentFill}`, outlineOffset: -3 },
              }}
            >
              <Typography sx={{ fontSize: 15, fontWeight: n.readAt ? 400 : 600 }}>{n.title}</Typography>
              <Typography sx={{ fontSize: 14, color: tokens.inkSecondary, mt: 0.25 }}>{n.message}</Typography>
              {n.request?.reference && (
                <Typography sx={{ fontSize: 14, color: tokens.inkSecondary, mt: 0.25 }}>
                  Référence : {n.request.reference}
                </Typography>
              )}
              <Typography sx={{ fontSize: 14, color: tokens.inkMuted, mt: 0.4 }}>
                {formatDateTime(n.createdAt)}
              </Typography>
            </Box>
          ))}
        </Stack>
        {(data?.total ?? 0) > pageSize && (
          <TablePagination
            component="div"
            count={data?.total ?? 0}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100]}
            labelRowsPerPage="Par page"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
          />
        )}
      </Paper>
    </Box>
  );
}

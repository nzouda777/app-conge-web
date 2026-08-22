import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  deleteAdminAttachment,
  deleteAdminRequest,
  listAdminRequests,
  purgeAllRequests,
} from '../../api/admin';
import { getApiErrorMessage } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { REQUEST_TYPE_LABELS, formatDate } from '../../types/labels';
import type { LeaveRequest } from '../../types/api';

export function AdminRequestsPage() {
  const queryClient = useQueryClient();
  const [manageRequest, setManageRequest] = useState<LeaveRequest | null>(null);
  const [deleteRequestTarget, setDeleteRequestTarget] = useState<LeaveRequest | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: listError } = useQuery({
    queryKey: ['admin', 'requests'],
    queryFn: () => listAdminRequests({ pageSize: 100 }),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'requests'] });
  }

  const deleteRequestMutation = useMutation({
    mutationFn: (id: string) => deleteAdminRequest(id),
    onSuccess: () => {
      invalidate();
      setDeleteRequestTarget(null);
      setManageRequest(null);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de supprimer cette demande.')),
  });

  const purgeMutation = useMutation({
    mutationFn: () => purgeAllRequests(),
    onSuccess: (res) => {
      invalidate();
      setPurgeOpen(false);
      setPurgeResult(
        `${res.deletedRequests} demande(s) et ${res.deletedAttachments} pièce(s) jointe(s) supprimées.`,
      );
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de vider la mémoire des demandes.')),
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72' }}>Demandes</Typography>
          <Typography sx={{ fontSize: 13, color: '#5D6D7E' }}>
            Consulter, supprimer une demande ou ses pièces jointes.
          </Typography>
        </Box>
        <Button variant="outlined" color="error" startIcon={<DeleteForeverIcon />} onClick={() => setPurgeOpen(true)}>
          Vider la mémoire des demandes
        </Button>
      </Box>

      {listError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorMessage(listError, 'Impossible de charger les demandes.')}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {purgeResult && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setPurgeResult(null)}>
          {purgeResult}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Référence</TableCell>
              <TableCell>Demandeur</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Dates</TableCell>
              <TableCell>Pièces</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7}>Chargement…</TableCell>
              </TableRow>
            )}
            {data?.items.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.reference ?? '(brouillon)'}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {r.employee.firstName} {r.employee.lastName}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{REQUEST_TYPE_LABELS[r.type]}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell sx={{ fontSize: 11 }}>
                  {formatDate(r.startDate)} → {formatDate(r.endDate)}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{r.attachments.length}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Voir la fiche">
                    <IconButton size="small" component={RouterLink} to={`/requests/${r.id}`}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Gérer les pièces jointes">
                    <IconButton size="small" onClick={() => setManageRequest(r)}>
                      <FolderOpenIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer la demande">
                    <IconButton size="small" color="error" onClick={() => setDeleteRequestTarget(r)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {data?.items.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={7} sx={{ color: '#5D6D7E', fontSize: 13 }}>
                  Aucune demande.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {manageRequest && (
        <ManageAttachmentsDialog
          request={manageRequest}
          onClose={() => setManageRequest(null)}
          onChanged={invalidate}
          onDeleteRequest={() => setDeleteRequestTarget(manageRequest)}
        />
      )}

      <ConfirmDialog
        open={!!deleteRequestTarget}
        title="Supprimer cette demande ?"
        description={
          deleteRequestTarget
            ? `La demande ${deleteRequestTarget.reference ?? '(brouillon)'} de ${deleteRequestTarget.employee.firstName} ${deleteRequestTarget.employee.lastName} sera définitivement supprimée, avec tout son historique et ses pièces jointes (fichiers compris). Cette action est irréversible.`
            : ''
        }
        confirmLabel="Supprimer"
        loading={deleteRequestMutation.isPending}
        onCancel={() => setDeleteRequestTarget(null)}
        onConfirm={() => deleteRequestTarget && deleteRequestMutation.mutate(deleteRequestTarget.id)}
      />

      <ConfirmDialog
        open={purgeOpen}
        title="Vider la mémoire des demandes ?"
        description="Toutes les demandes, leur historique et toutes les pièces jointes (fichiers compris) seront supprimés définitivement, pour tous les agents. Les employés et les comptes de connexion ne sont pas touchés. Cette action est irréversible."
        confirmLabel="Tout supprimer"
        loading={purgeMutation.isPending}
        onCancel={() => setPurgeOpen(false)}
        onConfirm={() => purgeMutation.mutate()}
      />
    </Box>
  );
}

function ManageAttachmentsDialog({
  request,
  onClose,
  onChanged,
  onDeleteRequest,
}: {
  request: LeaveRequest;
  onClose: () => void;
  onChanged: () => void;
  onDeleteRequest: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState(request.attachments);

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteAdminAttachment(request.id, attachmentId),
    onSuccess: (_, attachmentId) => {
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      onChanged();
    },
    onError: (e) => setError(getApiErrorMessage(e, "Impossible de supprimer cette pièce jointe.")),
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Pièces jointes — {request.reference ?? '(brouillon)'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {attachments.length === 0 && (
            <Typography sx={{ fontSize: 13, color: '#5D6D7E' }}>Aucune pièce jointe sur cette demande.</Typography>
          )}
          {attachments.map((a) => (
            <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 13 }}>
                {a.originalName} ({Math.round(a.size / 1024)} Ko)
              </Typography>
              <IconButton
                size="small"
                color="error"
                disabled={deleteAttachmentMutation.isPending}
                onClick={() => deleteAttachmentMutation.mutate(a.id)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
        <Button color="error" startIcon={<DeleteIcon />} onClick={onDeleteRequest}>
          Supprimer toute la demande
        </Button>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}

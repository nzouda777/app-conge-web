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
  PURGE_CONFIRMATION_PHRASE,
  deleteAdminAttachment,
  deleteAdminRequest,
  listAdminRequests,
  purgeAllRequests,
} from '../../api/admin';
import { getApiErrorMessage } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { StepUpDialog } from '../../components/StepUpDialog';
import { tokens } from '../../theme/tokens';
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

  // Les deux actions destructives exigent désormais le mot de passe de
  // l'administrateur, redemandé au moment de l'acte (StepUpDialog). L'erreur
  // est affichée DANS la boîte, pour qu'un mot de passe mal saisi se corrige
  // sans tout recommencer.
  const [stepUpError, setStepUpError] = useState<string | null>(null);

  const deleteRequestMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => deleteAdminRequest(id, password),
    onSuccess: () => {
      invalidate();
      setDeleteRequestTarget(null);
      setManageRequest(null);
      setStepUpError(null);
    },
    onError: (e) => setStepUpError(getApiErrorMessage(e, 'Impossible de supprimer cette demande.')),
  });

  const purgeMutation = useMutation({
    mutationFn: (password: string) => purgeAllRequests(password),
    onSuccess: (res) => {
      invalidate();
      setPurgeOpen(false);
      setStepUpError(null);
      setPurgeResult(
        `${res.deletedRequests} demande(s) et ${res.deletedAttachments} pièce(s) jointe(s) supprimées.`,
      );
    },
    onError: (e) => setStepUpError(getApiErrorMessage(e, 'Impossible de vider la mémoire des demandes.')),
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, color: tokens.brand }}>
            Demandes
          </Typography>
          <Typography sx={{ color: tokens.inkSecondary }}>
            Consulter, supprimer une demande ou ses pièces jointes. Chaque suppression est
            journalisée et rend à l'agent les jours de congé que la demande réservait.
          </Typography>
        </Box>
        <Button variant="outlined" color="error" startIcon={<DeleteForeverIcon />} onClick={() => setPurgeOpen(true)}>
          Vider la mémoire des demandes
        </Button>
      </Box>

      {listError && (
        <Alert severity="error" role="alert" sx={{ mb: 2 }}>
          {getApiErrorMessage(listError, 'Impossible de charger les demandes.')}
        </Alert>
      )}
      {error && (
        <Alert severity="error" role="alert" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {purgeResult && (
        <Alert severity="success" role="status" sx={{ mb: 2 }} onClose={() => setPurgeResult(null)}>
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
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{r.reference ?? '(brouillon)'}</TableCell>
                <TableCell sx={{ fontSize: 13 }}>
                  {r.employee.firstName} {r.employee.lastName}
                </TableCell>
                <TableCell sx={{ fontSize: 13 }}>{REQUEST_TYPE_LABELS[r.type]}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell sx={{ fontSize: 13 }}>
                  {formatDate(r.startDate)} → {formatDate(r.endDate)}
                </TableCell>
                <TableCell sx={{ fontSize: 13 }}>{r.attachments.length}</TableCell>
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
                <TableCell colSpan={7} sx={{ color: tokens.inkSecondary, fontSize: 14 }}>
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

      <StepUpDialog
        open={!!deleteRequestTarget}
        title="Supprimer cette demande ?"
        description={
          deleteRequestTarget
            ? `La demande ${deleteRequestTarget.reference ?? '(brouillon)'} de ${deleteRequestTarget.employee.firstName} ${deleteRequestTarget.employee.lastName} sera supprimée, avec son historique et ses pièces jointes.`
            : ''
        }
        consequence="Sans retour possible. Les jours de congé que cette demande réservait sont rendus à l'agent, et la suppression est consignée au journal d'audit."
        confirmLabel="Supprimer"
        loading={deleteRequestMutation.isPending}
        error={stepUpError}
        onCancel={() => {
          setDeleteRequestTarget(null);
          setStepUpError(null);
        }}
        onConfirm={(password) =>
          deleteRequestTarget && deleteRequestMutation.mutate({ id: deleteRequestTarget.id, password })
        }
      />

      <StepUpDialog
        open={purgeOpen}
        title="Vider la mémoire des demandes ?"
        description="Toutes les demandes de tous les agents, leur historique de décision et toutes les pièces jointes seront supprimés. Les agents, les comptes et l'organigramme ne sont pas touchés."
        consequence="Cette opération efface la trace horodatée de chaque décision de congé de la Direction. Elle est sans retour : assurez-vous qu'une sauvegarde de la base a été prise aujourd'hui. Les numéros de référence déjà émis ne seront pas réattribués."
        confirmLabel="Tout supprimer"
        requiredPhrase={PURGE_CONFIRMATION_PHRASE}
        loading={purgeMutation.isPending}
        error={stepUpError}
        onCancel={() => {
          setPurgeOpen(false);
          setStepUpError(null);
        }}
        onConfirm={(password) => purgeMutation.mutate(password)}
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
  const [attachments, setAttachments] = useState(request.attachments);
  // Supprimer une pièce jointe détruit un document signé : l'action passe,
  // elle aussi, par une ré-authentification.
  const [attachmentTarget, setAttachmentTarget] = useState<{ id: string; name: string } | null>(null);
  const [stepUpError, setStepUpError] = useState<string | null>(null);

  const deleteAttachmentMutation = useMutation({
    mutationFn: ({ attachmentId, password }: { attachmentId: string; password: string }) =>
      deleteAdminAttachment(request.id, attachmentId, password),
    onSuccess: (_, { attachmentId }) => {
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      setAttachmentTarget(null);
      setStepUpError(null);
      onChanged();
    },
    onError: (e) => setStepUpError(getApiErrorMessage(e, 'Impossible de supprimer cette pièce jointe.')),
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Pièces jointes - {request.reference ?? '(brouillon)'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {attachments.length === 0 && (
            <Typography sx={{ color: tokens.inkSecondary }}>
              Aucune pièce jointe sur cette demande.
            </Typography>
          )}
          {attachments.map((a) => (
            <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14 }}>
                {a.originalName} ({Math.round(a.size / 1024)} Ko)
              </Typography>
              <IconButton
                size="small"
                color="error"
                aria-label={`Supprimer la pièce ${a.originalName}`}
                disabled={deleteAttachmentMutation.isPending}
                onClick={() => setAttachmentTarget({ id: a.id, name: a.originalName })}
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

      <StepUpDialog
        open={!!attachmentTarget}
        title="Supprimer cette pièce jointe ?"
        description={
          attachmentTarget
            ? `Le fichier « ${attachmentTarget.name} » sera supprimé de la demande et effacé du serveur.`
            : ''
        }
        consequence="S'il s'agit du document signé remis à l'agent, celui-ci ne pourra plus le télécharger."
        confirmLabel="Supprimer la pièce"
        loading={deleteAttachmentMutation.isPending}
        error={stepUpError}
        onCancel={() => {
          setAttachmentTarget(null);
          setStepUpError(null);
        }}
        onConfirm={(password) =>
          attachmentTarget &&
          deleteAttachmentMutation.mutate({ attachmentId: attachmentTarget.id, password })
        }
      />
    </Dialog>
  );
}

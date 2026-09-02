import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import { useAuth } from '../auth/AuthContext';
import {
  attachmentDownloadUrl,
  deleteAttachment,
  getRequest,
  managerReview,
  requestDocumentUrl,
  submitRequest,
  uploadAttachment,
} from '../api/requests';
import { assignRequest, submitDecision } from '../api/sdag';
import { listEmployees } from '../api/misc';
import { StatusBadge } from '../components/StatusBadge';
import { getApiErrorMessage } from '../api/client';
import {
  PERMISSION_SUBTYPE_LABELS,
  REQUEST_TYPE_LABELS,
  formatDate,
  formatDateTime,
} from '../types/labels';
import type { Attachment } from '../types/api';

// The validated, signed document is the one the agent de traitement dropped
// on the dossier — as opposed to the requester's own justificatifs. It is
// what the requester receives once the dossier is validated, and validating
// requires it (see SdagService.decision). TEST_INTEGRAL counts too: the omni
// test account plays the agent's part on its own dossier.
function isTreatedDocument(a: Attachment): boolean {
  return a.uploadedBy?.role === 'AGENT_TRAITEMENT_SDAG' || a.uploadedBy?.role === 'TEST_INTEGRAL';
}

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<'manager' | 'sdag' | null>(null);
  const [comment, setComment] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [observation, setObservation] = useState('');

  const requestId = id!;
  const { data: request, isLoading } = useQuery({
    queryKey: ['requests', requestId],
    queryFn: () => getRequest(requestId),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees', 'sdag-picker'],
    queryFn: () => listEmployees({ role: 'AGENT_TRAITEMENT_SDAG' }),
    enabled:
      (user?.role === 'SOUS_DIRECTEUR_SDAG' || user?.role === 'TEST_INTEGRAL') &&
      request?.status === 'PENDING_ASSIGNMENT',
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['requests'] });
    queryClient.invalidateQueries({ queryKey: ['sdag'] });
    queryClient.invalidateQueries({ queryKey: ['quota'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  const submitMutation = useMutation({
    mutationFn: () => submitRequest(requestId),
    onSuccess: () => {
      invalidate();
      setError(null);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de soumettre la demande.')),
  });

  const managerReviewMutation = useMutation({
    mutationFn: (params: { decision: 'FAVORABLE' | 'DEFAVORABLE'; comment?: string }) =>
      managerReview(requestId, params.decision, params.comment),
    onSuccess: () => {
      invalidate();
      setRejectDialog(null);
      setComment('');
      setError(null);
    },
    onError: (e) => setError(getApiErrorMessage(e, "Impossible d'enregistrer l'avis.")),
  });

  const assignMutation = useMutation({
    mutationFn: () => assignRequest(requestId, assigneeId),
    onSuccess: () => {
      invalidate();
      setAssigneeId('');
      setError(null);
    },
    onError: (e) => setError(getApiErrorMessage(e, "Impossible de coter cette demande.")),
  });

  const decisionMutation = useMutation({
    mutationFn: (params: { decision: 'APPROVED' | 'REJECTED'; comment?: string }) =>
      submitDecision(requestId, params.decision, params.comment, observation),
    onSuccess: () => {
      invalidate();
      setRejectDialog(null);
      setComment('');
      setObservation('');
      setError(null);
    },
    onError: (e) => setError(getApiErrorMessage(e, "Impossible d'enregistrer la décision.")),
  });

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(requestId, file, setUploadProgress),
    onSuccess: () => {
      invalidate();
      setError(null);
      setUploadProgress(null);
    },
    onError: (e) => {
      setUploadProgress(null);
      setError(getApiErrorMessage(e, "Impossible d'ajouter la pièce jointe."));
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(requestId, attachmentId),
    onSuccess: () => {
      invalidate();
      setError(null);
    },
    onError: (e) => setError(getApiErrorMessage(e, "Impossible de retirer la pièce jointe.")),
  });

  if (isLoading || !request) {
    return <Typography sx={{ p: 2 }}>Chargement…</Typography>;
  }

  // The test-only omni role satisfies every stage's role check on the front
  // end too, so a single account walks the whole circuit. The ownership /
  // status conditions still apply (self-manager, self-cotation), so the
  // account only ever acts on its own request — real profiles are untouched.
  const isTest = user?.role === 'TEST_INTEGRAL';
  const isOwner = request.employeeId === user?.employeeId;
  const canSubmit = isOwner && request.status === 'DRAFT';
  const canManagerReview =
    (user?.role === 'RESPONSABLE_HIERARCHIQUE' || isTest) &&
    request.status === 'PENDING_MANAGER_REVIEW' &&
    request.employee.managerId === user?.employeeId;
  const canAssign =
    (user?.role === 'SOUS_DIRECTEUR_SDAG' || isTest) && request.status === 'PENDING_ASSIGNMENT';
  // The agent de traitement holding the dossier validates or rejects it
  // directly — the Sous-Directeur's last act on the file is the cotation, so
  // there is no separate "décision" stage for them any more.
  const canDecideAsAgent =
    (user?.role === 'AGENT_TRAITEMENT_SDAG' || isTest) &&
    request.status === 'ASSIGNED' &&
    request.currentAssigneeId === user?.employeeId;
  // Mirrors DocumentsController's access rule: while the dossier is being
  // instructed (ASSIGNED), only the assigned agent and the Sous-Directeur
  // SDAG can consult the document — everyone with view rights gets it once
  // the dossier is decided.
  const isAssignedAgent =
    (user?.role === 'AGENT_TRAITEMENT_SDAG' || isTest) && request.currentAssigneeId === user?.employeeId;
  const isDirector = user?.role === 'SOUS_DIRECTEUR_SDAG' || isTest;
  const isRequestManager =
    (user?.role === 'RESPONSABLE_HIERARCHIQUE' || isTest) && request.employee.managerId === user?.employeeId;
  const inProgressStage = request.status === 'ASSIGNED';
  const isDecided = request.status === 'APPROVED' || request.status === 'REJECTED';
  const canDownloadDocument = inProgressStage
    ? isAssignedAgent || isDirector || user?.role === 'ADMIN'
    : isDecided && (isOwner || isRequestManager || isAssignedAgent || isDirector || user?.role === 'ADMIN');
  // Motif du rejet, affiché juste sous le badge de statut — on regarde la
  // bonne source selon l'étape où le rejet a eu lieu (responsable vs SDAG).
  const rejectionComment =
    request.status === 'REJECTED'
      ? request.sdagDecisions.find((d) => d.decision === 'REJECTED')?.comment
      : request.status === 'MANAGER_REJECTED'
        ? request.managerReviews.find((r) => r.decision === 'DEFAVORABLE')?.comment
        : null;
  // Once decided, the requester's only relevant document is the one the
  // treatment agent uploaded, and it's now reached via "Télécharger le
  // document" (see DocumentsController) rather than listed here — their
  // own original justificatifs no longer matter either. SDAG/admin keep
  // seeing the full attachment history under "Pièces justificatives".
  const treatedDocuments = request.attachments.filter(isTreatedDocument);
  const hasTreatedDocument = treatedDocuments.length > 0;
  // While the agent holds the dossier, their final document lives in the
  // Actions panel below, so it isn't repeated in this list.
  const visibleAttachments = isOwner && isDecided
    ? []
    : canDecideAsAgent
      ? request.attachments.filter((a) => !isTreatedDocument(a))
      : request.attachments;
  // Visible to whoever can already view the request — the SDAG director
  // needs to read it before deciding, and it was previously surfaced
  // nowhere at all.
  const latestObservation = request.sdagTreatments.at(-1)?.observation;

  // Cotation picker options. A real Sous-Directeur sees exactly the SDAG
  // treatment agents (unchanged). The test-only account additionally sees
  // itself, so it can cote its own dossier to itself and then treat it —
  // this extra entry is never shown to real profiles.
  type AssigneeOption = { id: string; firstName: string; lastName: string; position: string };
  const assigneeOptions: AssigneeOption[] = employees?.items ? [...employees.items] : [];
  if (isTest && user?.employee && !assigneeOptions.some((e) => e.id === user.employeeId)) {
    assigneeOptions.unshift({
      id: user.employeeId,
      firstName: user.employee.firstName,
      lastName: user.employee.lastName,
      position: user.employee.position,
    });
  }

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Button onClick={() => navigate(-1)} size="small" sx={{ mb: 2 }}>
        ← Retour
      </Button>

      <Paper sx={{ p: 3, mb: 2, borderRadius: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'flex-start',
            gap: { xs: 2, sm: 3 },
          }}
        >
          {/* Colonne principale (gauche) : toutes les informations, remontées
              pour occuper l'espace face à la colonne statut. */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, color: '#5D6D7E', fontFamily: 'monospace' }}>
              {request.reference ?? 'Brouillon (pas encore soumis)'}
            </Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: '#1B4F72' }}>
              {REQUEST_TYPE_LABELS[request.type]}
              {request.permissionSubType ? ` — ${PERMISSION_SUBTYPE_LABELS[request.permissionSubType]}` : ''}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#5D6D7E' }}>
              {request.employee.firstName} {request.employee.lastName} · {request.employee.organizationUnit?.name}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 2, mt: 2, mb: 2 }}>
              {request.type === 'ATTESTATION_PRESENCE' ? (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>Objet</Typography>
                  <Typography sx={{ fontSize: 14 }}>Attestation de présence effective au poste</Typography>
                </Box>
              ) : request.type === 'REPRISE_SERVICE' ? (
                <Box>
                  <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>Date de reprise de service</Typography>
                  <Typography sx={{ fontSize: 14 }}>{formatDate(request.startDate)}</Typography>
                </Box>
              ) : (
                <>
                  <Box>
                    <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>Du</Typography>
                    <Typography sx={{ fontSize: 14 }}>{formatDate(request.startDate)}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>Au</Typography>
                    <Typography sx={{ fontSize: 14 }}>{formatDate(request.endDate)}</Typography>
                  </Box>
                </>
              )}
              {request.calculatedDays !== null && request.calculatedDays > 0 && (
                <Box>
                  <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>Durée calculée</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1B4F72' }}>
                    {request.calculatedDays} jour(s)
                  </Typography>
                </Box>
              )}
              {request.interimEmployee && (
                <Box>
                  <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>Intérimaire</Typography>
                  <Typography sx={{ fontSize: 14 }}>
                    {request.interimEmployee.firstName} {request.interimEmployee.lastName}
                  </Typography>
                </Box>
              )}
            </Box>

            {request.motif && request.type !== 'ATTESTATION_PRESENCE' && (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>Motif</Typography>
                <Typography sx={{ fontSize: 13 }}>{request.motif}</Typography>
              </Box>
            )}

            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1B4F72', mb: 1 }}>Pièces justificatives</Typography>
            <Stack spacing={0.5} sx={{ mb: canSubmit ? 1.5 : 0 }}>
              {visibleAttachments.length === 0 && (
                <Typography sx={{ fontSize: 12, color: '#5D6D7E' }}>Aucune pièce jointe.</Typography>
              )}
              {visibleAttachments.map((a) => (
                <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <a
                    href={attachmentDownloadUrl(request.id, a.id)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13, color: '#2E86C1' }}
                  >
                    {a.originalName} ({Math.round(a.size / 1024)} Ko)
                  </a>
                  {canSubmit && (
                    <IconButton
                      size="small"
                      color="error"
                      disabled={deleteAttachmentMutation.isPending}
                      onClick={() => deleteAttachmentMutation.mutate(a.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Stack>
            {canSubmit && (
              <Button
                component="label"
                size="small"
                startIcon={<UploadFileIcon />}
                variant="outlined"
                disabled={uploadMutation.isPending}
              >
                Ajouter une pièce (PDF, JPG, PNG)
                <input
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadMutation.mutate(file);
                    e.target.value = '';
                  }}
                />
              </Button>
            )}
            {canSubmit && uploadMutation.isPending && (
              <Box sx={{ maxWidth: 320, mt: 1 }}>
                <LinearProgress variant="determinate" value={uploadProgress ?? 0} />
                <Typography sx={{ fontSize: 11, color: '#5D6D7E', mt: 0.5 }}>
                  Téléchargement… {uploadProgress ?? 0}%
                </Typography>
              </Box>
            )}
          </Box>

          {/* Colonne statut / actions (droite). */}
          <Stack
            spacing={1}
            sx={{
              alignItems: { xs: 'flex-start', sm: 'flex-end' },
              flexShrink: 0,
              width: { xs: '100%', sm: 250 },
              textAlign: { xs: 'left', sm: 'right' },
            }}
          >
            <StatusBadge status={request.status} />
            {rejectionComment && (
              <Typography sx={{ fontSize: 12, color: '#C0392B', textAlign: 'inherit' }}>{rejectionComment}</Typography>
            )}
            {latestObservation && (
              <Box sx={{ textAlign: 'inherit' }}>
                <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>Observation de l'agent de traitement</Typography>
                <Typography sx={{ fontSize: 12.5 }}>{latestObservation}</Typography>
              </Box>
            )}
            {canDownloadDocument && (
              <Button
                component="a"
                href={requestDocumentUrl(request.id)}
                target="_blank"
                rel="noreferrer"
                size="small"
                variant="outlined"
                startIcon={<DescriptionIcon />}
              >
                Télécharger le document
              </Button>
            )}
          </Stack>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {(canSubmit || canManagerReview || canAssign || canDecideAsAgent) && (
        <Paper sx={{ p: 3, mb: 2, borderRadius: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72', mb: 2 }}>Actions</Typography>

          {canSubmit && (
            <Button variant="contained" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
              Soumettre la demande
            </Button>
          )}

          {canManagerReview && (
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => managerReviewMutation.mutate({ decision: 'FAVORABLE' })}
              >
                Avis favorable
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => setRejectDialog('manager')}
              >
                Avis défavorable
              </Button>
            </Stack>
          )}

          {canAssign && (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <TextField
                select
                size="small"
                label="Agent de traitement"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                sx={{ minWidth: 260 }}
              >
                {!employees && assigneeOptions.length === 0 && <MenuItem value="">Chargement…</MenuItem>}
                {employees && assigneeOptions.length === 0 && (
                  <MenuItem value="" disabled>
                    Aucun agent de traitement SDAG actif
                  </MenuItem>
                )}
                {assigneeOptions.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} — {emp.position}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="contained" disabled={!assigneeId} onClick={() => assignMutation.mutate()}>
                Coter
              </Button>
            </Stack>
          )}

          {canDecideAsAgent && (
            <Stack spacing={2.5} sx={{ maxWidth: 600 }}>
              {/* Le document final se dépose ici, dans les actions : il n'est
                  plus une simple pièce du dossier, il est l'acte de validation. */}
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1B4F72' }}>
                  Document traité et signé
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: '#5D6D7E', mt: 0.3, mb: 1.2 }}>
                  Téléchargez le dossier, traitez-le hors application, puis déposez ici le document validé et signé.
                  Il est obligatoire pour valider, et c'est celui que l'agent demandeur recevra.
                </Typography>
                {treatedDocuments.length > 0 && (
                  <Stack spacing={0.5} sx={{ mb: 1.2 }}>
                    {treatedDocuments.map((a) => (
                      <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <a
                          href={attachmentDownloadUrl(request.id, a.id)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 13, color: '#2E86C1' }}
                        >
                          {a.originalName} ({Math.round(a.size / 1024)} Ko)
                        </a>
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
                )}
                <Button
                  component="label"
                  size="small"
                  startIcon={<UploadFileIcon />}
                  variant={hasTreatedDocument ? 'outlined' : 'contained'}
                  disabled={uploadMutation.isPending}
                >
                  {hasTreatedDocument ? 'Déposer une autre version' : 'Téléverser le document (PDF, JPG, PNG)'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadMutation.mutate(file);
                      e.target.value = '';
                    }}
                  />
                </Button>
                {uploadMutation.isPending && (
                  <Box sx={{ maxWidth: 320, mt: 1 }}>
                    <LinearProgress variant="determinate" value={uploadProgress ?? 0} />
                    <Typography sx={{ fontSize: 11, color: '#5D6D7E', mt: 0.5 }}>
                      Téléchargement… {uploadProgress ?? 0}%
                    </Typography>
                  </Box>
                )}
              </Box>

              <TextField
                label="Observation (facultatif)"
                placeholder="Notes sur l'étude du dossier…"
                multiline
                minRows={3}
                fullWidth
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
              />

              {!hasTreatedDocument && (
                <Alert severity="info">
                  Déposez le document traité et signé pour pouvoir valider ce dossier. Un rejet reste possible sans
                  document.
                </Alert>
              )}

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  disabled={!hasTreatedDocument || decisionMutation.isPending}
                  onClick={() => decisionMutation.mutate({ decision: 'APPROVED' })}
                >
                  Valider
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  disabled={decisionMutation.isPending}
                  onClick={() => setRejectDialog('sdag')}
                >
                  Rejeter
                </Button>
              </Stack>
            </Stack>
          )}
        </Paper>
      )}

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72', mb: 2 }}>Historique</Typography>
        <Stack spacing={1.5} divider={<Divider />}>
          {request.statusHistory.map((h) => (
            <Box key={h.id}>
              <Typography sx={{ fontSize: 12, color: '#5D6D7E' }}>{formatDateTime(h.createdAt)}</Typography>
              <Typography sx={{ fontSize: 13 }}>
                {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : `Création (${h.toStatus})`}
              </Typography>
              {h.comment && <Typography sx={{ fontSize: 12, color: '#5D6D7E' }}>« {h.comment} »</Typography>}
            </Box>
          ))}
        </Stack>
      </Paper>

      <Dialog open={!!rejectDialog} onClose={() => setRejectDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{rejectDialog === 'manager' ? 'Avis défavorable' : 'Rejeter la demande'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Motif (obligatoire)"
            multiline
            minRows={3}
            fullWidth
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(null)}>Annuler</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!comment.trim()}
            onClick={() => {
              if (rejectDialog === 'manager') {
                managerReviewMutation.mutate({ decision: 'DEFAVORABLE', comment });
              } else {
                decisionMutation.mutate({ decision: 'REJECTED', comment });
              }
            }}
          >
            Confirmer le rejet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

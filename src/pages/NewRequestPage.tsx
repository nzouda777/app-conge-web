import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../auth/AuthContext';
import { createRequest, deleteAttachment, submitRequest, uploadAttachment, updateRequest } from '../api/requests';
import { fetchQuotaSummary } from '../api/misc';
import { listEmployees } from '../api/misc';
import { getApiErrorMessage } from '../api/client';
import type { LeaveRequest, PermissionSubType, RequestType } from '../types/api';
import { PERMISSION_SUBTYPE_LABELS, REQUEST_TYPE_LABELS, formatDate } from '../types/labels';

const REQUIRES_ATTACHMENT: RequestType[] = ['CONGE_MALADIE', 'CONGE_MATERNITE', 'PERMISSION_EVENEMENT_FAMILIAL'];

const schema = z
  .object({
    type: z.enum([
      'CONGE_ANNUEL',
      'CONGE_MALADIE',
      'CONGE_MATERNITE',
      'PERMISSION_EVENEMENT_FAMILIAL',
      'REPRISE_SERVICE',
      'ATTESTATION_PRESENCE',
    ]),
    permissionSubType: z.string().optional(),
    startDate: z.string().min(1, 'La date de début est requise.'),
    endDate: z.string().min(1, 'La date de fin est requise.'),
    motif: z.string().optional(),
    interimEmployeeId: z.string().optional(),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: 'La date de fin doit être postérieure ou égale à la date de début.',
    path: ['endDate'],
  })
  .refine((v) => v.type !== 'ATTESTATION_PRESENCE' || !!v.motif?.trim(), {
    message: "La référence de la note d'affectation est requise.",
    path: ['motif'],
  });

type FormValues = z.infer<typeof schema>;

const STEPS = ['Informations', 'Détails de la demande', 'Documents', 'Vérification & Transmission'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewRequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [draft, setDraft] = useState<LeaveRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: quota } = useQuery({ queryKey: ['quota'], queryFn: () => fetchQuotaSummary() });
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'CONGE_ANNUEL', startDate: '', endDate: '', motif: '' },
  });
  const type = watch('type');

  // ATTESTATION_PRESENCE has no meaningful date range for the requester to
  // pick — the schema still requires non-null dates, so we fill them with
  // today's date transparently.
  useEffect(() => {
    if (type === 'ATTESTATION_PRESENCE') {
      const today = todayIso();
      setValue('startDate', today, { shouldValidate: true });
      setValue('endDate', today, { shouldValidate: true });
    }
  }, [type, setValue]);

  const { data: employees } = useQuery({
    queryKey: ['employees', 'interim-picker'],
    queryFn: () => listEmployees(),
    enabled: type === 'CONGE_ANNUEL',
  });

  // Only congé annuel has a real, enforced numeric quota — see
  // docs/architecture-decisions.md. Surface a block as soon as the agent
  // picks dates, instead of waiting for the final submission to fail.
  function checkAnnualLeaveQuota(req: LeaveRequest): string | null {
    if (req.type !== 'CONGE_ANNUEL' || !quota) return null;
    const requested = req.calculatedDays ?? 0;
    const available = quota.congeAnnuel.availableDays;
    if (requested > available) {
      return `Solde de congé annuel insuffisant : ${available} jour(s) disponible(s), ${requested} demandé(s). Modifiez les dates avant de continuer.`;
    }
    return null;
  }

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createRequest({
        type: values.type,
        permissionSubType: values.permissionSubType as PermissionSubType | undefined,
        startDate: values.startDate,
        endDate: values.endDate,
        motif: values.motif || undefined,
        interimEmployeeId: values.interimEmployeeId || undefined,
      }),
    onSuccess: (req) => {
      setDraft(req);
      const quotaError = checkAnnualLeaveQuota(req);
      if (quotaError) {
        setError(quotaError);
        return;
      }
      setError(null);
      setActiveStep(2);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de créer la demande.')),
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateRequest(draft!.id, {
        type: values.type,
        permissionSubType: values.permissionSubType as PermissionSubType | undefined,
        startDate: values.startDate,
        endDate: values.endDate,
        motif: values.motif || undefined,
        interimEmployeeId: values.interimEmployeeId || undefined,
      }),
    onSuccess: (req) => {
      setDraft(req);
      const quotaError = checkAnnualLeaveQuota(req);
      if (quotaError) {
        setError(quotaError);
        return;
      }
      setError(null);
      setActiveStep(2);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de mettre à jour la demande.')),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitRequest(draft!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
      navigate(`/requests/${draft!.id}`);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de soumettre la demande.')),
  });

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(draft!.id, file, setUploadProgress),
    onSuccess: (attachment) => {
      setError(null);
      setUploadProgress(null);
      // The draft is local state, not driven by the requests query cache —
      // update it directly, otherwise the new file only appears after
      // leaving and re-entering this step.
      setDraft((prev) => (prev ? { ...prev, attachments: [...prev.attachments, attachment] } : prev));
    },
    onError: (e) => {
      setUploadProgress(null);
      setError(getApiErrorMessage(e, "Impossible d'ajouter la pièce jointe."));
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(draft!.id, attachmentId),
    onSuccess: (_, attachmentId) => {
      setError(null);
      setDraft((prev) =>
        prev ? { ...prev, attachments: prev.attachments.filter((a) => a.id !== attachmentId) } : prev,
      );
    },
    onError: (e) => setError(getApiErrorMessage(e, "Impossible de retirer la pièce jointe.")),
  });

  const attachmentsRequired = REQUIRES_ATTACHMENT.includes(type);

  const onStep2Next = handleSubmit((values) => {
    if (draft) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  });

  const available = quota?.congeAnnuel.availableDays ?? null;

  const showInterim = type === 'CONGE_ANNUEL';
  const showPermissionSubType = type === 'PERMISSION_EVENEMENT_FAMILIAL';
  const isReprise = type === 'REPRISE_SERVICE';
  const isAttestation = type === 'ATTESTATION_PRESENCE';

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72', mb: 0.5 }}>
        Nouvelle demande
      </Typography>
      <Typography sx={{ fontSize: 13, color: '#5D6D7E', mb: 3 }}>
        Remplissez le formulaire — les champs marqués * sont obligatoires
      </Typography>

      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid #f0f1f3' }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {activeStep === 0 && (
            <Stack spacing={2}>
              <Typography sx={{ fontSize: 12, color: '#1B4F72', bgcolor: '#EBF5FB', p: 1.5, borderRadius: 1 }}>
                Votre supérieur hiérarchique :{' '}
                <strong>
                  {user?.employee?.manager
                    ? `${user.employee.manager.firstName} ${user.employee.manager.lastName}`
                    : 'non défini — contactez la SDAG'}
                </strong>
              </Typography>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Type de demande" required>
                    {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              {showPermissionSubType && (
                <Controller
                  name="permissionSubType"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select label="Motif de la permission" required>
                      {Object.entries(PERMISSION_SUBTYPE_LABELS).map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              )}
              {showPermissionSubType && (
                <Controller
                  name="motif"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Motif (facultatif)" multiline minRows={2} />
                  )}
                />
              )}
              <Button variant="contained" onClick={() => setActiveStep(1)} sx={{ alignSelf: 'flex-start' }}>
                Étape suivante →
              </Button>
            </Stack>
          )}

          {activeStep === 1 && (
            <Stack spacing={2}>
              {isAttestation ? (
                <Controller
                  name="motif"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Référence de la note d'affectation"
                      required
                      multiline
                      minRows={2}
                      error={!!errors.motif}
                      helperText={errors.motif?.message ?? "Note vous affectant à ce poste, citée dans l'attestation."}
                    />
                  )}
                />
              ) : isReprise ? (
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="date"
                      label="Date de reprise de service"
                      required
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                      error={!!errors.startDate}
                      helperText={errors.startDate?.message}
                      onChange={(e) => {
                        field.onChange(e);
                        setValue('endDate', e.target.value, { shouldValidate: true });
                      }}
                    />
                  )}
                />
              ) : (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Controller
                    name="startDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Date de début"
                        required
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                        error={!!errors.startDate}
                        helperText={errors.startDate?.message}
                      />
                    )}
                  />
                  <Controller
                    name="endDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Date de fin"
                        required
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                        error={!!errors.endDate}
                        helperText={errors.endDate?.message}
                      />
                    )}
                  />
                </Box>
              )}
              {available !== null && type === 'CONGE_ANNUEL' && (
                <Alert severity={available <= 0 ? 'error' : 'info'}>
                  Solde de congé annuel disponible : {available} jour(s).
                </Alert>
              )}
              {showInterim && (
                <Controller
                  name="interimEmployeeId"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select label="Intérimaire (facultatif)">
                      <MenuItem value="">Aucun</MenuItem>
                      {employees?.items
                        .filter((e) => e.id !== user?.employeeId)
                        .map((e) => (
                          <MenuItem key={e.id} value={e.id}>
                            {e.firstName} {e.lastName} — {e.position}
                          </MenuItem>
                        ))}
                    </TextField>
                  )}
                />
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setActiveStep(0)}>← Étape précédente</Button>
                <Button
                  variant="contained"
                  onClick={onStep2Next}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Étape suivante →
                </Button>
              </Box>
            </Stack>
          )}

          {activeStep === 2 && draft && (
            <Stack spacing={2}>
              {!isAttestation && !isReprise && (
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>
                  Durée calculée : {draft.calculatedDays ?? 0} jour(s)
                </Typography>
              )}
              {draft.durationWarnings && draft.durationWarnings.length > 0 && (
                <Alert severity="warning">{draft.durationWarnings.join(' ')}</Alert>
              )}
              {attachmentsRequired ? (
                <Alert severity="info">
                  Une pièce justificative est obligatoire pour ce type de demande (PDF, JPG ou PNG, 10 Mo max).
                </Alert>
              ) : (
                <Alert severity="info">Aucune pièce justificative n'est exigée pour ce type de demande.</Alert>
              )}
              <Button
                component="label"
                variant="outlined"
                sx={{ alignSelf: 'flex-start' }}
                disabled={uploadMutation.isPending}
              >
                Charger un fichier
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
                <Box sx={{ maxWidth: 320 }}>
                  <LinearProgress variant="determinate" value={uploadProgress ?? 0} />
                  <Typography sx={{ fontSize: 11, color: '#5D6D7E', mt: 0.5 }}>
                    Téléchargement… {uploadProgress ?? 0}%
                  </Typography>
                </Box>
              )}
              <Stack spacing={0.5}>
                {draft.attachments.map((a) => (
                  <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 13, flex: 1 }}>{a.originalName}</Typography>
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setActiveStep(1)}>← Étape précédente</Button>
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(3)}
                  disabled={attachmentsRequired && draft.attachments.length === 0}
                >
                  Étape suivante →
                </Button>
              </Box>
            </Stack>
          )}

          {activeStep === 3 && draft && (
            <Stack spacing={2}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>Récapitulatif</Typography>
              <Typography sx={{ fontSize: 13 }}>{REQUEST_TYPE_LABELS[draft.type]}</Typography>
              {isAttestation ? (
                <Typography sx={{ fontSize: 13 }}>Référence de la note : {draft.motif}</Typography>
              ) : isReprise ? (
                <Typography sx={{ fontSize: 13 }}>Reprise de service le {formatDate(draft.startDate)}</Typography>
              ) : (
                <Typography sx={{ fontSize: 13 }}>
                  Du {formatDate(draft.startDate)} au {formatDate(draft.endDate)} — {draft.calculatedDays} jour(s)
                </Typography>
              )}
              <Typography sx={{ fontSize: 12, color: '#5D6D7E' }}>
                Cette demande sera transmise à : <strong>
                  {user?.employee?.manager
                    ? `${user.employee.manager.firstName} ${user.employee.manager.lastName}`
                    : 'votre responsable hiérarchique'}
                </strong>{' '}
                pour avis, avant transmission à la SDAG.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setActiveStep(2)}>← Étape précédente</Button>
                <Button variant="contained" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                  Soumettre la demande
                </Button>
              </Box>
            </Stack>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

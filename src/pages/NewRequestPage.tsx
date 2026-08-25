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

// Prior-leave types a reprise-de-service note can grant (matches the API's
// REPRISE_PRIOR_TYPES). Printed on the attestation via reprisePriorType.
const REPRISE_PRIOR_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'PERMISSION', label: "Permission d'absence" },
  { value: 'CONGE_ANNUEL', label: 'Congé annuel' },
  { value: 'CONGE_MALADIE', label: 'Congé de maladie' },
  { value: 'CONGE_MATERNITE', label: 'Congé de maternité' },
];

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
    // REPRISE_SERVICE only — details of the note that granted the prior leave.
    // Optional: any left empty print as a blank "………" on the attestation.
    repriseNoteNumber: z.string().optional(),
    repriseNoteDate: z.string().optional(),
    reprisePriorType: z.string().optional(),
    reprisePriorStartDate: z.string().optional(),
    reprisePriorEndDate: z.string().optional(),
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

// Two screens only: a single saisie form, then the verification/recap before
// submission.
const STEPS = ['Saisie de la demande', 'Vérification & Transmission'];

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
  // A file picked on the form before the draft exists — uploaded when the user
  // moves to the verification screen (attachments need a persisted request id).
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [advancing, setAdvancing] = useState(false);

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
  const permissionSubType = watch('permissionSubType');

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

  function buildPayload(values: FormValues) {
    return {
      type: values.type,
      permissionSubType: values.permissionSubType as PermissionSubType | undefined,
      startDate: values.startDate,
      endDate: values.endDate,
      motif: values.motif || undefined,
      interimEmployeeId: values.interimEmployeeId || undefined,
      repriseNoteNumber: values.repriseNoteNumber || undefined,
      repriseNoteDate: values.repriseNoteDate || undefined,
      reprisePriorType: values.reprisePriorType || undefined,
      reprisePriorStartDate: values.reprisePriorStartDate || undefined,
      reprisePriorEndDate: values.reprisePriorEndDate || undefined,
    };
  }

  // Single "Suivant": persist the draft (create the first time, update on
  // return), upload the pending justificatif if there is one, then move to the
  // verification screen.
  const onFormNext = handleSubmit(async (values) => {
    setAdvancing(true);
    try {
      const req = draft ? await updateRequest(draft.id, buildPayload(values)) : await createRequest(buildPayload(values));
      setDraft(req);
      const quotaError = checkAnnualLeaveQuota(req);
      if (quotaError) {
        setError(quotaError);
        return;
      }
      setError(null);
      if (pendingFile) {
        const attachment = await uploadAttachment(req.id, pendingFile, setUploadProgress);
        setDraft({ ...req, attachments: [...req.attachments, attachment] });
        setPendingFile(null);
        setUploadProgress(null);
      }
      setActiveStep(1);
    } catch (e) {
      setUploadProgress(null);
      setError(getApiErrorMessage(e, "Impossible d'enregistrer la demande."));
    } finally {
      setAdvancing(false);
    }
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
  const available = quota?.congeAnnuel.availableDays ?? null;

  const showInterim = type === 'CONGE_ANNUEL';
  const showPermissionSubType = type === 'PERMISSION_EVENEMENT_FAMILIAL';
  const isReprise = type === 'REPRISE_SERVICE';
  const isAttestation = type === 'ATTESTATION_PRESENCE';
  const hasAttachment = !!pendingFile || (draft?.attachments.length ?? 0) > 0;

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
              {showPermissionSubType && permissionSubType === 'AUTRE' && (
                <Controller
                  name="motif"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Motif (facultatif)" multiline minRows={2} />
                  )}
                />
              )}

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
                <Stack spacing={2}>
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
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72', mt: 1 }}>
                    Note administrative du congé précédent
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#5D6D7E', mt: -1 }}>
                    Détails de la note qui vous a accordé le congé. Les champs laissés vides apparaîtront en pointillés
                    sur l'attestation, à compléter à la main.
                  </Typography>
                  <Controller
                    name="repriseNoteNumber"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Numéro de la note" fullWidth />}
                  />
                  <Controller
                    name="repriseNoteDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Date de la note"
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    )}
                  />
                  <Controller
                    name="reprisePriorType"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} select label="Type de congé accordé">
                        {REPRISE_PRIOR_TYPE_OPTIONS.map((o) => (
                          <MenuItem key={o.value} value={o.value}>
                            {o.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Controller
                      name="reprisePriorStartDate"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="date"
                          label="Congé précédent — du"
                          fullWidth
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      )}
                    />
                    <Controller
                      name="reprisePriorEndDate"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="date"
                          label="au"
                          fullWidth
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      )}
                    />
                  </Box>
                </Stack>
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

              {/* Justificatif — shown only for the request types that require one. */}
              {attachmentsRequired && (
                <Stack spacing={1}>
                  <Alert severity="info">
                    Une pièce justificative est obligatoire pour ce type de demande (PDF, JPG ou PNG, 10 Mo max).
                  </Alert>
                  <Button
                    component="label"
                    variant="outlined"
                    sx={{ alignSelf: 'flex-start' }}
                    disabled={advancing}
                  >
                    Charger un fichier
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setPendingFile(file);
                        e.target.value = '';
                      }}
                    />
                  </Button>
                  {draft?.attachments.map((a) => (
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
                  {pendingFile && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: 13, flex: 1 }}>{pendingFile.name}</Typography>
                      <IconButton size="small" color="error" onClick={() => setPendingFile(null)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  {uploadProgress !== null && (
                    <Box sx={{ maxWidth: 320 }}>
                      <LinearProgress variant="determinate" value={uploadProgress ?? 0} />
                      <Typography sx={{ fontSize: 11, color: '#5D6D7E', mt: 0.5 }}>
                        Téléchargement… {uploadProgress ?? 0}%
                      </Typography>
                    </Box>
                  )}
                </Stack>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={onFormNext}
                  disabled={advancing || (attachmentsRequired && !hasAttachment)}
                >
                  Suivant →
                </Button>
              </Box>
            </Stack>
          )}

          {activeStep === 1 && draft && (
            <Stack spacing={2}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>Récapitulatif</Typography>
              <Typography sx={{ fontSize: 13 }}>{REQUEST_TYPE_LABELS[draft.type]}</Typography>
              {isAttestation ? (
                <Typography sx={{ fontSize: 13 }}>Référence de la note : {draft.motif}</Typography>
              ) : isReprise ? (
                <Stack spacing={0.5}>
                  <Typography sx={{ fontSize: 13 }}>Reprise de service le {formatDate(draft.startDate)}</Typography>
                  {(draft.repriseNoteNumber ||
                    draft.repriseNoteDate ||
                    draft.reprisePriorType ||
                    draft.reprisePriorStartDate ||
                    draft.reprisePriorEndDate) && (
                    <Typography sx={{ fontSize: 12, color: '#5D6D7E' }}>
                      Note n°{draft.repriseNoteNumber || '………'}
                      {draft.repriseNoteDate ? ` du ${formatDate(draft.repriseNoteDate)}` : ''}
                      {draft.reprisePriorType
                        ? ` — ${REPRISE_PRIOR_TYPE_OPTIONS.find((o) => o.value === draft.reprisePriorType)?.label ?? draft.reprisePriorType}`
                        : ''}
                      {draft.reprisePriorStartDate || draft.reprisePriorEndDate
                        ? ` (du ${draft.reprisePriorStartDate ? formatDate(draft.reprisePriorStartDate) : '………'} au ${draft.reprisePriorEndDate ? formatDate(draft.reprisePriorEndDate) : '………'})`
                        : ''}
                    </Typography>
                  )}
                </Stack>
              ) : (
                <Typography sx={{ fontSize: 13 }}>
                  Du {formatDate(draft.startDate)} au {formatDate(draft.endDate)} — {draft.calculatedDays} jour(s)
                </Typography>
              )}
              {draft.durationWarnings && draft.durationWarnings.length > 0 && (
                <Alert severity="warning">{draft.durationWarnings.join(' ')}</Alert>
              )}
              {draft.attachments.length > 0 && (
                <Typography sx={{ fontSize: 13, color: '#5D6D7E' }}>
                  Pièce justificative : {draft.attachments.map((a) => a.originalName).join(', ')}
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
                <Button onClick={() => setActiveStep(0)}>← Modifier la saisie</Button>
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

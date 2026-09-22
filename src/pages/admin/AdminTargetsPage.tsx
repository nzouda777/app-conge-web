import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { listProcessingTargets, saveProcessingTargets, type TargetStage } from '../../api/admin';
import { getApiErrorMessage } from '../../api/client';

// Les étapes contrôlables, dans l'ordre du circuit.
const STAGES: { stage: TargetStage; label: string; help: string }[] = [
  { stage: 'HIERARCHY', label: 'Avis hiérarchique', help: "De la soumission à la transmission à la SDAG, tous niveaux confondus." },
  { stage: 'ASSIGNMENT', label: 'Cotation SDAG', help: "De la réception à la SDAG jusqu'à l'affectation à un agent de traitement." },
  { stage: 'TREATMENT', label: 'Traitement', help: "De l'affectation jusqu'à la signature ou au rejet." },
  { stage: 'TOTAL', label: 'Durée totale', help: "De la soumission à la clôture. Sert à l'indicateur « Dans le délai »." },
];

export function AdminTargetsPage() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: targets } = useQuery({
    queryKey: ['admin', 'processing-targets'],
    queryFn: () => listProcessingTargets(),
  });

  useEffect(() => {
    if (!targets) return;
    const next: Record<string, string> = {};
    STAGES.forEach((s) => {
      const t = targets.find((x) => x.stage === s.stage);
      next[s.stage] = t ? String(t.days) : '';
    });
    setValues(next);
  }, [targets]);

  const mutation = useMutation({
    mutationFn: () =>
      saveProcessingTargets(
        STAGES.map((s) => ({ stage: s.stage, days: Number(values[s.stage] || 0) })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'processing-targets'] });
      queryClient.invalidateQueries({ queryKey: ['requests', 'overview'] });
      setError(null);
      setSaved(true);
    },
    onError: (e) => setError(getApiErrorMessage(e, "Impossible d'enregistrer les délais.")),
  });

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72', mb: 0.5 }}>
        Délais de traitement
      </Typography>
      <Typography sx={{ fontSize: 13, color: '#5D6D7E', mb: 3 }}>
        Durées cibles, en jours, au-delà desquelles un dossier est signalé en retard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
          Délais enregistrés. Le tableau de bord en tient compte immédiatement.
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 2 }}>
        Une étape laissée vide, ou à 0, n'est pas contrôlée : son indicateur reste vide plutôt que d'afficher
        un résultat fondé sur une valeur arbitraire.
      </Alert>

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Stack spacing={2.5}>
          {STAGES.map((s) => (
            <Box key={s.stage} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#1B4F72' }}>{s.label}</Typography>
                <Typography sx={{ fontSize: 11.5, color: '#5D6D7E' }}>{s.help}</Typography>
              </Box>
              <TextField
                size="small"
                type="number"
                label="Jours"
                value={values[s.stage] ?? ''}
                onChange={(e) => {
                  setSaved(false);
                  setValues((v) => ({ ...v, [s.stage]: e.target.value }));
                }}
                slotProps={{ htmlInput: { min: 0, max: 365 } }}
                sx={{ width: 120 }}
              />
            </Box>
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

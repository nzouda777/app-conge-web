import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { listProcessingTargets, saveProcessingTargets, type TargetStage } from '../../api/admin';
import { getApiErrorMessage } from '../../api/client';
import { tokens } from '../../theme/tokens';

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

  // `Number('')` vaut 0, mais `Number('abc')` vaut NaN — et un champ de type
  // `number` accepte « e », « + » et « - ». Le NaN partait jusqu'au serveur,
  // qui le refusait par une erreur peu parlante. On normalise ici, et le
  // bouton reste bloqué tant qu'une valeur est inexploitable.
  const parsed = STAGES.map((s) => {
    const raw = (values[s.stage] ?? '').trim();
    const n = raw === '' ? 0 : Number(raw);
    return { stage: s.stage, days: n, valid: Number.isInteger(n) && n >= 0 && n <= 365 };
  });
  const allValid = parsed.every((p) => p.valid);

  const mutation = useMutation({
    mutationFn: () => saveProcessingTargets(parsed.map(({ stage, days }) => ({ stage, days }))),
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
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: tokens.brand, mb: 0.5 }}>
        Délais de traitement
      </Typography>
      <Typography sx={{ fontSize: 14, color: tokens.inkSecondary, mb: 3 }}>
        Durées cibles, en jours, au-delà desquelles un dossier est signalé en retard
      </Typography>

      {error && (
        <Alert severity="error" role="alert" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" role="status" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
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
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: tokens.brand }}>{s.label}</Typography>
                <Typography sx={{ fontSize: 13, color: tokens.inkSecondary }}>{s.help}</Typography>
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
                error={!parsed.find((p) => p.stage === s.stage)?.valid}
                helperText={
                  parsed.find((p) => p.stage === s.stage)?.valid
                    ? ' '
                    : 'Nombre entier de 0 à 365.'
                }
                slotProps={{ htmlInput: { min: 0, max: 365 } }}
                sx={{ width: 150 }}
              />
            </Box>
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              disabled={mutation.isPending || !allValid}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

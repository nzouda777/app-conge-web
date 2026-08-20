import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { listAnnualLeaveDecisions, upsertAnnualLeaveDecision } from '../../api/admin';
import { getApiErrorMessage } from '../../api/client';
import type { EmployeeStatus } from '../../types/api';

const CATEGORIES: { value: EmployeeStatus; label: string; hint: string }[] = [
  { value: 'CIVIL_SERVANT', label: 'Fonctionnaires', hint: 'Décision accordant les congés aux fonctionnaires' },
  {
    value: 'LABOUR_CODE',
    label: 'Agents relevant du Code du travail',
    hint: 'Décision accordant les congés aux agents contractuels',
  },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR + 1 - i); // current+1 down to current-5

export function AdminDecisionsPage() {
  const [year, setYear] = useState(CURRENT_YEAR);

  return (
    <Box sx={{ maxWidth: 820 }}>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72' }}>Décisions ministérielles</Typography>
      <Typography sx={{ fontSize: 13, color: '#5D6D7E', mb: 2 }}>
        Chaque année, le Ministre des Finances signe deux décisions accordant les congés annuels (une pour les
        fonctionnaires, une pour les agents relevant du Code du travail). Saisissez ici leur numéro et leur date : ils
        sont repris automatiquement dans les demandes de congé annuel de l'exercice.
      </Typography>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <TextField
          select
          size="small"
          label="Exercice (année)"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          sx={{ width: 200 }}
        >
          {YEARS.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      <Stack spacing={2}>
        {CATEGORIES.map((cat) => (
          <DecisionCard key={cat.value} year={year} category={cat.value} label={cat.label} hint={cat.hint} />
        ))}
      </Stack>
    </Box>
  );
}

function DecisionCard({
  year,
  category,
  label,
  hint,
}: {
  year: number;
  category: EmployeeStatus;
  label: string;
  hint: string;
}) {
  const queryClient = useQueryClient();
  const [number, setNumber] = useState('');
  const [date, setDate] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: decisions } = useQuery({
    queryKey: ['admin', 'decisions', year],
    queryFn: () => listAnnualLeaveDecisions(year),
  });

  // Prefill from the existing decision for this (year, category) when loaded
  // or when the year changes.
  useEffect(() => {
    const existing = decisions?.find((d) => d.category === category);
    setNumber(existing?.number ?? '');
    setDate(existing ? existing.date.slice(0, 10) : '');
    setSaved(false);
    setError(null);
  }, [decisions, category, year]);

  const mutation = useMutation({
    mutationFn: () => upsertAnnualLeaveDecision({ year, category, number, date }),
    onSuccess: () => {
      setSaved(true);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'decisions', year] });
    },
    onError: (e) => setError(getApiErrorMessage(e, "Impossible d'enregistrer la décision.")),
  });

  return (
    <Paper sx={{ p: 2.5, borderRadius: 2 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1B4F72' }}>{label}</Typography>
      <Typography sx={{ fontSize: 12, color: '#5D6D7E', mb: 1.5 }}>{hint}</Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setSaved(false)}>
          Décision enregistrée pour l'exercice {year}.
        </Alert>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
        <TextField
          label="Numéro de la décision"
          size="small"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="ex. 0001/MINFI/SG/DGB"
          sx={{ flex: 1, minWidth: 240 }}
        />
        <TextField
          label="Date de la décision"
          type="date"
          size="small"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 190 }}
        />
        <Button
          variant="contained"
          disabled={!number.trim() || !date || mutation.isPending}
          onClick={() => mutation.mutate()}
          sx={{ mt: { xs: 0, sm: 0.2 } }}
        >
          Enregistrer
        </Button>
      </Stack>
    </Paper>
  );
}

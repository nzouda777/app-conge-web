import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { changePassword } from '../api/auth';
import { getApiErrorMessage } from '../api/client';

const MIN_LENGTH = 8;

// Changement de mot de passe par le titulaire du compte. Le mot de passe
// actuel est exigé — le serveur le vérifie aussi, cette saisie n'est pas un
// simple confort d'interface.
export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
    setDone(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const mutation = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      setError(null);
      setDone(true);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de modifier le mot de passe.')),
  });

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    current.length > 0 && next.length >= MIN_LENGTH && next === confirm && !mutation.isPending;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontSize: 16, color: '#1B4F72' }}>Modifier mon mot de passe</DialogTitle>
      <DialogContent>
        {done ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            Votre mot de passe a été modifié. Il sera demandé à votre prochaine connexion.
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Mot de passe actuel"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              fullWidth
              error={tooShort}
              helperText={tooShort ? `${MIN_LENGTH} caractères minimum.` : `${MIN_LENGTH} caractères minimum.`}
            />
            <TextField
              label="Confirmer le nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              fullWidth
              error={mismatch}
              helperText={mismatch ? 'Les deux saisies ne correspondent pas.' : ' '}
            />
            <Typography sx={{ fontSize: 11.5, color: '#5D6D7E' }}>
              Votre mot de passe actuel est demandé pour confirmer qu'il s'agit bien de vous.
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{done ? 'Fermer' : 'Annuler'}</Button>
        {!done && (
          <Button variant="contained" disabled={!canSubmit} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Modification…' : 'Modifier'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

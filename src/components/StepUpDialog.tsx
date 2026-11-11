import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { tokens } from '../theme/tokens';

// Ré-authentification au moment de l'acte.
//
// Les opérations qui détruisent des données ou redistribuent des droits
// exigent le mot de passe de l'administrateur, en plus de sa session. Une
// session ouverte sur un poste laissé sans surveillance ne doit pas suffire à
// supprimer un compte ou à vider l'historique des demandes.
//
// `confirmationPhrase` ajoute une seconde barrière pour la purge totale : une
// phrase se recopie délibérément, là où un bouton se clique par réflexe.
export function StepUpDialog({
  open,
  title,
  description,
  consequence,
  confirmLabel = 'Confirmer',
  requiredPhrase,
  loading = false,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  /** Ce que l'action fait réellement, dit sans détour. */
  consequence?: string;
  confirmLabel?: string;
  requiredPhrase?: string;
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (password: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [phrase, setPhrase] = useState('');

  const phraseOk = !requiredPhrase || phrase === requiredPhrase;
  const canConfirm = password.length > 0 && phraseOk && !loading;

  function close() {
    setPassword('');
    setPhrase('');
    onCancel();
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : close} fullWidth maxWidth="sm">
      <DialogTitle sx={{ color: tokens.dangerText }}>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <DialogContentText sx={{ color: tokens.inkSecondary }}>{description}</DialogContentText>
          {consequence && (
            <Alert severity="warning" role="alert" sx={{ fontSize: 14 }}>
              {consequence}
            </Alert>
          )}
          {error && (
            <Alert severity="error" role="alert">
              {error}
            </Alert>
          )}
          {requiredPhrase && (
            <TextField
              label="Recopiez exactement la phrase ci-dessous"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              fullWidth
              error={phrase.length > 0 && !phraseOk}
              helperText={
                <Typography component="span" sx={{ fontSize: 14, fontFamily: 'monospace' }}>
                  {requiredPhrase}
                </Typography>
              }
            />
          )}
          <TextField
            label="Votre mot de passe"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            autoFocus
            helperText="Redemandé parce que cette action est sans retour."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={loading}>
          Annuler
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={!canConfirm}
          onClick={() => onConfirm(password)}
        >
          {loading ? 'En cours…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

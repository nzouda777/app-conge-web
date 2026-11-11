import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { changePassword } from '../api/auth';
import { getApiErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { tokens } from '../theme/tokens';
import { PasswordRequirements, passwordIssues } from './PasswordRequirements';

// Écran de changement du mot de passe provisoire.
//
// Il REMPLACE l'application tant que le changement n'a pas eu lieu : l'API
// refuse de toute façon tout le reste, et enchaîner des erreurs d'autorisation
// serait incompréhensible. C'est ce qui rend le mot de passe provisoire
// réellement provisoire — l'ancienne version se contentait d'un mot de passe
// commun que rien n'obligeait à changer.
export function ForcedPasswordChange() {
  const { logout, refresh } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const issues = passwordIssues(next);
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = current.length > 0 && issues.length === 0 && next === confirm;

  // Confirmation avant de renvoyer à la connexion. Sans elle, l'agent était
  // déconnecté sans un mot et atterrissait sur un écran de connexion nu —
  // indistinguable d'un échec, alors que son mot de passe venait d'être
  // enregistré.
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => setDone(true),
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de modifier le mot de passe.')),
  });

  return (
    <Box
      component="main"
      id="contenu-principal"
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: tokens.appBackground,
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 460, width: '100%', borderRadius: 2 }}>
        {done ? (
          <Stack spacing={2.5}>
            <Typography component="h1" sx={{ fontSize: 20, fontWeight: 600, color: tokens.brand }}>
              Mot de passe enregistré
            </Typography>
            <Alert severity="success" role="status">
              Votre mot de passe est en place. Reconnectez-vous avec pour accéder à vos congés —
              c'est lui qui sera demandé désormais.
            </Alert>
            <Button
              variant="contained"
              size="large"
              onClick={async () => {
                await logout();
                await refresh();
              }}
            >
              Aller à la connexion
            </Button>
          </Stack>
        ) : (
        <>
        <Typography component="h1" sx={{ fontSize: 20, fontWeight: 600, color: tokens.brand, mb: 1 }}>
          Choisissez votre mot de passe
        </Typography>
        <Typography sx={{ color: tokens.inkSecondary, mb: 3 }}>
          Votre compte a été ouvert avec un mot de passe provisoire, remis par votre hiérarchie.
          Remplacez-le maintenant : il est le seul à vous donner accès à vos congés, et vous êtes
          seul à devoir le connaître.
        </Typography>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (canSubmit) mutation.mutate();
          }}
        >
          <Stack spacing={2.5}>
            {error && (
              <Alert severity="error" role="alert">
                {error}
              </Alert>
            )}
            <TextField
              label="Mot de passe provisoire"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              fullWidth
              required
              autoFocus
            />
            <Box>
              <TextField
                label="Nouveau mot de passe"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                fullWidth
                required
                error={next.length > 0 && issues.length > 0}
              />
              <PasswordRequirements value={next} />
            </Box>
            <TextField
              label="Confirmez le nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              fullWidth
              required
              error={mismatch}
              helperText={mismatch ? 'Les deux saisies ne correspondent pas.' : ' '}
            />
            <Button type="submit" variant="contained" size="large" disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer et continuer'}
            </Button>
            <Button onClick={() => void logout()} size="small">
              Se déconnecter
            </Button>
          </Stack>
        </form>
        </>
        )}
      </Paper>
    </Box>
  );
}

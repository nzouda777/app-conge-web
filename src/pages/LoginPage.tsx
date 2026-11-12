import { useState } from 'react';
import { Alert, Box, Button, IconButton, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { takeRedirectAfterLogin, useAuth } from '../auth/AuthContext';
import { getApiErrorMessage } from '../api/client';
import { tokens } from '../theme/tokens';

export function LoginPage() {
  const { login, user, sessionNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Déjà connecté : on ne réaffiche pas le formulaire.
  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(matricule, password);
      // On revient à la page demandée avant la redirection. L'utilisateur
      // atterrissait systématiquement sur le tableau de bord, quelle que soit
      // la page qu'il cherchait à ouvrir.
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? takeRedirectAfterLogin() ?? '/dashboard', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Matricule ou mot de passe incorrect.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: tokens.appBackground,
        p: 2,
      }}
      component="main"
      id="contenu-principal"
    >
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component="img"
            src="/logo-dgb-request.svg"
            alt="DGB Request"
            sx={{ height: 64, maxWidth: '100%', mb: 1 }}
          />
          <Typography sx={{ fontSize: 14, color: tokens.inkSecondary, mt: 0.5 }}>
            Ministère des Finances — Direction Générale du Budget
          </Typography>
        </Box>
        <Paper sx={{ p: 3.5, borderRadius: 2 }}>
          <Typography component="h1" sx={{ fontSize: 17, fontWeight: 600, color: tokens.brand, mb: 2.5 }}>
            Connexion
          </Typography>
          {/* Message affiché après une session tombée : l'application
              redirigeait vers la connexion sans jamais dire pourquoi. */}
          {sessionNotice && (
            <Alert severity="info" role="status" sx={{ mb: 2 }}>
              {sessionNotice}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Matricule"
              type="text"
              fullWidth
              required
              margin="normal"
              autoComplete="username"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              // Matricule fictif : ce dépôt est public, et un matricule réel
              // affiché ici désigne une personne identifiable.
              placeholder="1234567A"
            />
            <TextField
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              margin="normal"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        onClick={() => setShowPassword((v) => !v)}
                        onMouseDown={(e) => e.preventDefault()}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {error && (
              // `role="alert"` : sans lui, un lecteur d'écran n'annonce jamais
              // l'échec de la connexion.
              <Alert severity="error" role="alert" sx={{ mt: 1.5 }}>
                {error}
              </Alert>
            )}
            <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
          <Typography sx={{ textAlign: 'center', mt: 2, fontSize: 14, color: tokens.inkSecondary }}>
            Mot de passe oublié ? Contactez la SDAG : un mot de passe provisoire vous sera remis.
          </Typography>
        </Paper>
        <Typography sx={{ textAlign: 'center', mt: 2, fontSize: 14, color: tokens.inkMuted }}>
          Usage strictement réservé au personnel de la DGB. Toute connexion est journalisée.
        </Typography>
      </Box>
    </Box>
  );
}

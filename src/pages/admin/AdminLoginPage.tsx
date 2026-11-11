import { useState } from 'react';
import { Alert, Box, Button, IconButton, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth, takeRedirectAfterLogin } from '../../auth/AuthContext';
import { getApiErrorMessage } from '../../api/client';
import { tokens } from '../../theme/tokens';

// Connexion à l'interface d'administration.
//
// Distincte de celle du personnel, et servie sur une autre origine. L'API
// refuse un compte non-ADMIN ici, et un compte ADMIN sur l'interface du
// personnel : la séparation est appliquée côté serveur, pas seulement affichée.
export function AdminLoginPage() {
  const { login, user, sessionNotice } = useAuth();
  const navigate = useNavigate();
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/utilisateurs" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(matricule, password);
      navigate(takeRedirectAfterLogin() ?? '/utilisateurs', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Matricule ou mot de passe incorrect.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      component="main"
      id="contenu-principal"
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: tokens.brandDark,
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: tokens.onBrand }}>
            DGB <Box component="span" sx={{ fontWeight: 400 }}>Administration</Box>
          </Typography>
          <Typography sx={{ fontSize: 14, color: tokens.sidebarSubtle, mt: 0.5 }}>
            Ministère des Finances — Direction Générale du Budget
          </Typography>
        </Box>

        <Paper sx={{ p: 3.5, borderRadius: 2 }}>
          <Typography component="h1" sx={{ fontSize: 17, fontWeight: 600, color: tokens.brand, mb: 2.5 }}>
            Connexion administrateur
          </Typography>

          {sessionNotice && (
            <Alert severity="info" role="status" sx={{ mb: 2 }}>
              {sessionNotice}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Matricule"
              fullWidth
              required
              margin="normal"
              autoComplete="username"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
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
              <Alert severity="error" role="alert" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2.5 }} disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          <Typography sx={{ fontSize: 14, color: tokens.inkSecondary, mt: 2.5 }}>
            Cette interface est réservée à l'administration de la plateforme. Les agents se
            connectent sur l'application du personnel.
          </Typography>
        </Paper>

        <Typography sx={{ textAlign: 'center', mt: 2, fontSize: 14, color: tokens.sidebarSubtle }}>
          Toute connexion, réussie ou refusée, est journalisée.
        </Typography>
      </Box>
    </Box>
  );
}

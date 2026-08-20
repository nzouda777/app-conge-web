import { useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getApiErrorMessage } from '../api/client';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const me = await login(matricule, password);
      navigate(me.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Matricule ou mot de passe incorrect.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f6fa',
      }}
    >
      <Box sx={{ width: 400 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography sx={{ fontSize: 10, color: '#5D6D7E', textTransform: 'uppercase', letterSpacing: 1 }}>
            République du Cameroun
          </Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#1B4F72' }}>
            Direction Générale du Budget
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#5D6D7E', mt: 0.5 }}>
            Gestion des Demandes du Personnel
          </Typography>
        </Box>
        <Paper sx={{ p: 3.5, borderRadius: 2 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#1B4F72', mb: 2.5 }}>Connexion</Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Matricule"
              type="text"
              fullWidth
              required
              margin="normal"
              size="small"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              placeholder="1149105B"
            />
            <TextField
              label="Mot de passe"
              type="password"
              fullWidth
              required
              margin="normal"
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 1.5 }}>
                {error}
              </Alert>
            )}
            <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
          <Typography sx={{ textAlign: 'center', mt: 2, fontSize: 12, color: '#5D6D7E' }}>
            Mot de passe oublié ? Contacter la SDAG
          </Typography>
        </Paper>
        <Typography sx={{ textAlign: 'center', mt: 2, fontSize: 11, color: '#95A5A6' }}>
          Système sécurisé — Usage strictement réservé au personnel DGB
        </Typography>
      </Box>
    </Box>
  );
}

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

// Filet de sécurité : sans lui, la moindre exception pendant un rendu vide
// l'écran sans un mot, et l'utilisateur ne peut rien rapporter d'exploitable.
// Ici l'erreur est affichée, recopiable, et l'application reste utilisable.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    // Reste dans la console pour le diagnostic technique.
    console.error('Erreur de rendu :', error, info.componentStack);
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    const details = [error.message, info?.componentStack?.split('\n').slice(0, 6).join('\n')]
      .filter(Boolean)
      .join('\n');

    return (
      <Box sx={{ p: 3, maxWidth: 820 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Une erreur a interrompu l'affichage de cette page. L'opération que vous veniez de lancer a
          peut-être abouti : vérifiez avant de la relancer.
        </Alert>
        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1B4F72', mb: 1 }}>
            Détail technique
          </Typography>
          <Typography
            component="pre"
            sx={{
              fontSize: 11.5,
              fontFamily: 'monospace',
              color: '#5D6D7E',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              bgcolor: '#FAFBFC',
              p: 1.5,
              borderRadius: 1.5,
              m: 0,
            }}
          >
            {details}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
            <Button variant="contained" size="small" onClick={() => window.location.reload()}>
              Recharger la page
            </Button>
            <Button
              size="small"
              onClick={() => navigator.clipboard?.writeText(details)}
            >
              Copier le détail
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }
}

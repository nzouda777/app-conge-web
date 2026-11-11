import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, Box, Button, Collapse, Paper, Typography } from '@mui/material';
import { tokens } from '../theme/tokens';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
  showDetails: boolean;
}

// Filet de sécurité : sans lui, la moindre exception pendant un rendu vide
// l'écran sans un mot, et l'utilisateur ne peut rien rapporter d'exploitable.
//
// Deux corrections par rapport à la version précédente :
//  - la barrière se RÉARME au changement de page : l'appelant lui passe la
//    route en `key`, ce qui la remonte. Elle restait auparavant en erreur
//    jusqu'à un rechargement complet, même en naviguant ailleurs.
//  - le détail technique est REPLIÉ. Une pile d'appels n'aide pas un agent ;
//    elle reste accessible en un clic, et copiable, pour le signalement.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    // Reste dans la console pour le diagnostic technique.
    console.error('Erreur de rendu :', error, info.componentStack);
  }

  render() {
    const { error, info, showDetails } = this.state;
    if (!error) return this.props.children;

    const details = [error.message, info?.componentStack?.split('\n').slice(0, 8).join('\n')]
      .filter(Boolean)
      .join('\n');

    return (
      <Box component="main" id="contenu-principal" sx={{ p: 3, maxWidth: 820 }}>
        <Alert severity="error" role="alert" sx={{ mb: 2 }}>
          Une erreur a interrompu l'affichage de cette page. L'opération que vous veniez de lancer a
          peut-être abouti : vérifiez avant de la relancer.
        </Alert>
        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography sx={{ color: tokens.inkSecondary, mb: 2 }}>
            Rechargez la page pour reprendre. Si le problème se répète, transmettez le détail
            technique à l'administration : il désigne précisément l'endroit en cause.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Recharger la page
            </Button>
            <Button onClick={() => this.setState({ showDetails: !showDetails })}>
              {showDetails ? 'Masquer le détail' : 'Afficher le détail technique'}
            </Button>
            <Button onClick={() => navigator.clipboard?.writeText(details)}>Copier le détail</Button>
          </Box>
          <Collapse in={showDetails}>
            <Typography
              component="pre"
              sx={{
                fontSize: 14,
                fontFamily: 'monospace',
                color: tokens.inkSecondary,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                bgcolor: tokens.surfaceSunk,
                p: 1.5,
                mt: 2,
                borderRadius: 1.5,
                overflowX: 'auto',
              }}
            >
              {details}
            </Typography>
          </Collapse>
        </Paper>
      </Box>
    );
  }
}

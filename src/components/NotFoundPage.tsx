import { Box, Button, Paper, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { tokens } from '../theme/tokens';

// Page « adresse introuvable ».
//
// Toute adresse inconnue redirigeait silencieusement vers le tableau de bord :
// un lien périmé ou une faute de frappe ramenait l'utilisateur à l'accueil sans
// qu'il comprenne pourquoi la page qu'il cherchait n'était pas là.
//
// Pas de `component="main"` ici : cette page est toujours rendue À L'INTÉRIEUR
// du cadre (Layout ou AdminLayout), qui déclare déjà le repère `main` et porte
// l'ancre `#contenu-principal`. En déclarer un second imbriquait deux `main` et
// dupliquait l'identifiant dans le document.
export function NotFoundPage({ homePath = '/dashboard' }: { homePath?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
      <Paper sx={{ p: 4, maxWidth: 520, borderRadius: 2 }}>
        <Typography component="h1" sx={{ fontSize: 20, fontWeight: 600, color: tokens.brand, mb: 1.5 }}>
          Cette page n'existe pas
        </Typography>
        <Typography sx={{ color: tokens.inkSecondary, mb: 3 }}>
          L'adresse demandée ne correspond à aucune page de l'application. Elle a pu changer, ou le
          lien que vous avez suivi est périmé. Si vous cherchiez un dossier précis, reprenez depuis
          la liste de vos demandes.
        </Typography>
        <Button component={RouterLink} to={homePath} variant="contained">
          Revenir à l'accueil
        </Button>
      </Paper>
    </Box>
  );
}

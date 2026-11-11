import { Box } from '@mui/material';
import { tokens } from '../theme/tokens';

// Lien d'évitement : première cible du clavier, il saute la navigation pour
// aller au contenu. Sans lui, parcourir l'application au clavier impose de
// retraverser tout le menu à chaque page. Visible uniquement au focus.
export function SkipLink() {
  return (
    <Box
      component="a"
      href="#contenu-principal"
      sx={{
        position: 'absolute',
        left: 8,
        top: -64,
        zIndex: (t) => t.zIndex.modal + 1,
        px: 2,
        py: 1.25,
        bgcolor: tokens.brand,
        color: tokens.onBrand,
        borderRadius: 1,
        fontSize: 15,
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'top 120ms ease',
        '&:focus': { top: 8 },
      }}
    >
      Aller au contenu principal
    </Box>
  );
}

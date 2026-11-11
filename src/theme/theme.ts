import { createTheme } from '@mui/material/styles';
import { frFR } from '@mui/material/locale';
import { fontSize, tokens } from './tokens';

// Palette institutionnelle, dérivée des jetons de ./tokens.ts. Toutes les
// couleurs de l'application viennent de là : elles étaient auparavant écrites
// en hexadécimal dans chaque composant, ce qui a laissé passer cinq paires
// non conformes au niveau AA du WCAG.
export const theme = createTheme(
  {
    palette: {
      primary: { main: tokens.brand, contrastText: '#FFFFFF' },
      secondary: { main: tokens.accentFill, contrastText: '#FFFFFF' },
      success: { main: tokens.successFill, contrastText: '#FFFFFF' },
      // L'orange porte du texte sombre : aucune nuance réellement orange ne
      // rend du blanc lisible (voir tokens.ts).
      warning: { main: tokens.warningFill, contrastText: tokens.warningFillText },
      error: { main: tokens.dangerFill, contrastText: '#FFFFFF' },
      background: { default: tokens.appBackground, paper: tokens.surface },
      text: { primary: tokens.ink, secondary: tokens.inkSecondary },
      divider: tokens.border,
    },
    typography: {
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      // 15 px de base plutôt que les 14 px de MUI : l'application est lue
      // toute la journée, souvent sur des écrans de qualité moyenne.
      fontSize: fontSize.body,
      htmlFontSize: 16,
      h1: { fontSize: fontSize.headline, fontWeight: 600 },
      h2: { fontSize: fontSize.title, fontWeight: 600 },
      body1: { fontSize: fontSize.body },
      body2: { fontSize: fontSize.body },
      caption: { fontSize: fontSize.caption },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: fontSize.body,
            // Cible tactile d'au moins 40 px de haut : les boutons « small »
            // de MUI descendent plus bas, ce qui est pénible au doigt.
            minHeight: 40,
          },
          sizeSmall: { minHeight: 34, fontSize: fontSize.caption },
        },
      },
      MuiPaper: { styleOverrides: { root: { border: `1px solid ${tokens.borderSoft}` } } },
      MuiCard: { styleOverrides: { root: { border: `1px solid ${tokens.borderSoft}`, boxShadow: 'none' } } },
      MuiTableCell: { styleOverrides: { root: { fontSize: fontSize.body } } },
      MuiTooltip: { defaultProps: { arrow: true } },
      // Focus clavier visible partout. Sans cela, l'application ne se parcourt
      // pas au clavier : rien n'indique où l'on se trouve.
      MuiCssBaseline: {
        styleOverrides: {
          ':focus-visible': {
            outline: `3px solid ${tokens.accentFill}`,
            outlineOffset: 2,
          },
          // Respecte le réglage système de réduction des animations.
          '@media (prefers-reduced-motion: reduce)': {
            '*': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' },
          },
        },
      },
    },
  },
  frFR,
);

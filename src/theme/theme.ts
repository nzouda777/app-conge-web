import { createTheme } from '@mui/material/styles';
import { frFR } from '@mui/material/locale';

// Institutional blue palette, echoing the mockup provided for the DGB
// leave-management module.
export const theme = createTheme(
  {
    palette: {
      primary: { main: '#1B4F72' },
      secondary: { main: '#2E86C1' },
      success: { main: '#27AE60' },
      warning: { main: '#F39C12' },
      error: { main: '#E74C3C' },
      background: { default: '#f5f6fa' },
    },
    typography: {
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      h1: { fontSize: 20, fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } } },
      MuiPaper: { styleOverrides: { root: { border: '1px solid #e8eaed' } } },
      MuiCard: {
        styleOverrides: { root: { border: '1px solid #e8eaed', boxShadow: 'none' } },
      },
    },
  },
  frFR,
);

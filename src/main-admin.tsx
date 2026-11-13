import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './index.css';
import AdminApp from './AdminApp';
import { theme } from './theme/theme';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ForcedPasswordChange } from './components/ForcedPasswordChange';
import { SkipLink } from './components/SkipLink';
import { shouldRetry } from './api/client';

// Point d'entrée de l'INTERFACE D'ADMINISTRATION.
//
// Servie sur une origine distincte de celle du personnel, avec son propre
// cookie de session et une session plus courte (1 h contre 8 h). Aucun service
// worker ici : une console d'administration n'a pas à fonctionner hors ligne,
// et ne doit rien conserver en cache.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetry, refetchOnWindowFocus: false, staleTime: 15_000 },
    mutations: { retry: false },
  },
});

function Shell() {
  const { mustChangePassword, user } = useAuth();
  const location = useLocation();
  return (
    <>
      <SkipLink />
      <ErrorBoundary key={location.pathname}>
        {user && mustChangePassword ? <ForcedPasswordChange /> : <AdminApp />}
      </ErrorBoundary>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        {/* basename : la console est servie à la racine de son propre domaine
            (base « / ») ou sous /admin de l'interface du personnel
            (build:all) ; les routes internes restent identiques. */}
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <Shell />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);

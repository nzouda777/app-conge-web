import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './index.css';
import App from './App.tsx';
import { theme } from './theme/theme';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ForcedPasswordChange } from './components/ForcedPasswordChange';
import { ConnectionStatus } from './components/ConnectionStatus';
import { SkipLink } from './components/SkipLink';
import { shouldRetry } from './api/client';
import { registerServiceWorker } from './pwa';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reprise limitée aux lectures et aux pannes de transport : voir
      // shouldRetry. `retry: false` était posé globalement, de sorte qu'une
      // coupure réseau d'une seconde se traduisait par un écran en erreur.
      retry: shouldRetry,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      // Jamais de reprise automatique sur une écriture : on ne sait pas si
      // elle a abouti, et rejouer un avis ou une validation serait pire que
      // l'échec.
      retry: false,
    },
  },
});

// Tant que le mot de passe provisoire n'a pas été changé, l'API refuse tout le
// reste : on affiche l'écran dédié plutôt qu'une succession d'erreurs.
function Shell({ updateAvailable }: { updateAvailable: boolean }) {
  const { mustChangePassword, user } = useAuth();
  const location = useLocation();

  return (
    <>
      <SkipLink />
      {/* `resetKey` réarme la barrière d'erreur au changement de page. */}
      <ErrorBoundary key={location.pathname}>
        {user && mustChangePassword ? <ForcedPasswordChange /> : <App />}
      </ErrorBoundary>
      <ConnectionStatus updateAvailable={updateAvailable} />
    </>
  );
}

function Root() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => registerServiceWorker(() => setUpdateAvailable(true)), []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Shell updateAvailable={updateAvailable} />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

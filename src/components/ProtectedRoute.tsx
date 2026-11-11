import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { Layout } from './Layout';

// Garde de route côté interface. Elle DOUBLE le contrôle serveur, elle ne le
// remplace pas : l'API applique ses propres règles de rôle et de périmètre, et
// c'est elle qui fait autorité. Ce qui est fait ici évite seulement d'afficher
// un écran que l'utilisateur ne pourrait pas remplir.
export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}
      >
        <CircularProgress aria-label="Chargement de votre session" />
      </Box>
    );
  }

  if (!user) {
    // `state` transporte la page demandée : après identification, on y revient
    // au lieu d'atterrir systématiquement sur le tableau de bord.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

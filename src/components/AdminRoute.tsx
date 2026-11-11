import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { AdminLayout } from './AdminLayout';

// Garde de route de l'interface d'administration.
//
// Elle double le contrôle serveur, elle ne le remplace pas : l'API exige le
// rôle ADMIN *et* une session émise sur cette interface (AdminSurfaceGuard).
// Ce qui est fait ici ne sert qu'à éviter d'afficher un écran vide.
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
        <CircularProgress aria-label="Chargement" />
      </Box>
    );
  }
  if (!user) return <Navigate to="/admin-login" replace />;

  return <AdminLayout>{children}</AdminLayout>;
}

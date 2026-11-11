import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { NewRequestPage } from './pages/NewRequestPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { ManagerRequestsPage } from './pages/ManagerRequestsPage';
import { SdagPage } from './pages/SdagPage';
import { MyTreatmentPage } from './pages/MyTreatmentPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OverviewPage } from './pages/OverviewPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotFoundPage } from './components/NotFoundPage';

// Routes de l'interface DU PERSONNEL.
//
// Les écrans d'administration n'en font plus partie : ils vivent dans un build
// distinct (src/AdminApp.tsx), servi sur une autre origine avec son propre
// cookie de session. Une faille d'exécution de script dans cette interface-ci
// ne peut donc plus atteindre la console d'administration.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <MyRequestsPage />
          </ProtectedRoute>
        }
      />
      {/* Tout agent de la DGB peut déposer une demande, quel que soit son
          poste. Seul le Directeur Général en est exclu : il arbitre, il ne
          demande pas. */}
      <Route
        path="/requests/new"
        element={
          <ProtectedRoute
            roles={[
              'AGENT',
              'RESPONSABLE_HIERARCHIQUE',
              'SOUS_DIRECTEUR_SDAG',
              'AGENT_TRAITEMENT_SDAG',
              'TEST_INTEGRAL',
            ]}
          >
            <NewRequestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/:id"
        element={
          <ProtectedRoute>
            <RequestDetailPage />
          </ProtectedRoute>
        }
      />
      {/* Vue d'ensemble du circuit, en lecture seule : tableau de bord du
          Directeur Général, auquel le Sous-Directeur SDAG accède aussi. */}
      <Route
        path="/vue-ensemble"
        element={
          <ProtectedRoute roles={['DIRECTEUR_GENERAL', 'SOUS_DIRECTEUR_SDAG', 'TEST_INTEGRAL']}>
            <OverviewPage />
          </ProtectedRoute>
        }
      />
      {/* Pas de restriction par rôle : examiner une demande dépend de qui vous
          encadre, pas de votre rôle. La liste renvoyée par l'API est déjà
          limitée à ce que l'utilisateur a le droit de voir. */}
      <Route
        path="/manager"
        element={
          <ProtectedRoute>
            <ManagerRequestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mes-dossiers"
        element={
          <ProtectedRoute roles={['AGENT_TRAITEMENT_SDAG', 'TEST_INTEGRAL']}>
            <MyTreatmentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sdag"
        element={
          <ProtectedRoute roles={['SOUS_DIRECTEUR_SDAG', 'TEST_INTEGRAL']}>
            <SdagPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {/* Une adresse inconnue affiche une vraie page « introuvable ». Elle
          redirigeait silencieusement vers le tableau de bord : un lien périmé
          ou une faute de frappe ramenait l'utilisateur à l'accueil sans qu'il
          comprenne pourquoi sa page n'était pas là. */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <NotFoundPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

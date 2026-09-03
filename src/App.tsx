import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { NewRequestPage } from './pages/NewRequestPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { ManagerRequestsPage } from './pages/ManagerRequestsPage';
import { SdagPage } from './pages/SdagPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminRequestsPage } from './pages/admin/AdminRequestsPage';
import { AdminDecisionsPage } from './pages/admin/AdminDecisionsPage';
import { ProtectedRoute } from './components/ProtectedRoute';

// ADMIN has its own separate space — send it to /admin instead of the
// normal operational dashboard whenever we'd otherwise land on  "/".
function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
}

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
      {/* Any DGB staff member may file a request — every non-ADMIN role. */}
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
      <Route
        path="/manager"
        element={
          <ProtectedRoute roles={['RESPONSABLE_HIERARCHIQUE', 'TEST_INTEGRAL']}>
            <ManagerRequestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sdag"
        element={
          <ProtectedRoute roles={['SOUS_DIRECTEUR_SDAG', 'AGENT_TRAITEMENT_SDAG', 'ADMIN', 'TEST_INTEGRAL']}>
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
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/requests"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminRequestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/decisions"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminDecisionsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

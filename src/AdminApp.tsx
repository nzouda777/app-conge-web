import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminRequestsPage } from './pages/admin/AdminRequestsPage';
import { AdminNewRequestPage } from './pages/admin/AdminNewRequestPage';
import { AdminDecisionsPage } from './pages/admin/AdminDecisionsPage';
import { AdminTargetsPage } from './pages/admin/AdminTargetsPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';
import { OverviewPage } from './pages/OverviewPage';
import { AdminRoute } from './components/AdminRoute';
import { NotFoundPage } from './components/NotFoundPage';

// Routes de l'interface d'administration. Elles ne figurent plus dans le
// bundle du personnel : les deux interfaces sont construites séparément
// (voir vite.config.ts) et servies sur deux origines.
export default function AdminApp() {
  return (
    <Routes>
      <Route path="/admin-login" element={<AdminLoginPage />} />
      {/* Redirection plutôt que double montage : « / » rendait la page des
          utilisateurs sans activer l'entrée correspondante du menu, laissant
          l'administrateur sans repère sur sa position. */}
      <Route path="/" element={<Navigate to="/utilisateurs" replace />} />
      <Route path="/utilisateurs" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="/demandes" element={<AdminRoute><AdminRequestsPage /></AdminRoute>} />
      {/* Saisie d'une demande pour le compte d'un agent (agent sans accès,
          demande remise sur papier). Elle suit ensuite le circuit ordinaire. */}
      <Route path="/nouvelle-demande" element={<AdminRoute><AdminNewRequestPage /></AdminRoute>} />
      <Route path="/decisions" element={<AdminRoute><AdminDecisionsPage /></AdminRoute>} />
      <Route path="/delais" element={<AdminRoute><AdminTargetsPage /></AdminRoute>} />
      {/* Journal d'audit : consultation seule, par construction — aucun point
          d'entrée d'écriture n'existe côté API, et un déclencheur PostgreSQL
          refuse toute modification ou suppression d'une ligne. */}
      <Route path="/journal" element={<AdminRoute><AdminAuditPage /></AdminRoute>} />
      <Route path="/pilotage" element={<AdminRoute><OverviewPage /></AdminRoute>} />
      <Route path="*" element={<AdminRoute><NotFoundPage homePath="/" /></AdminRoute>} />
    </Routes>
  );
}

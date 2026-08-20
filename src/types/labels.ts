import type { PermissionSubType, RequestStatus, RequestType, Role } from './api';

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  CONGE_ANNUEL: 'Congé administratif annuel',
  CONGE_MALADIE: 'Congé de maladie',
  CONGE_MATERNITE: 'Congé de maternité',
  PERMISSION_EVENEMENT_FAMILIAL: 'Permission',
  REPRISE_SERVICE: 'Reprise de service',
  ATTESTATION_PRESENCE: 'Attestation de présence effective',
};

export const PERMISSION_SUBTYPE_LABELS: Record<PermissionSubType, string> = {
  PATERNITE: 'Paternité',
  MARIAGE: 'Mariage',
  DECES_CONJOINT: 'Décès du conjoint',
  DECES_ASCENDANT: "Décès d'un ascendant",
  DECES_DESCENDANT: "Décès d'un descendant",
  AUTRE: 'Autre motif (permission motivée)',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING_MANAGER_REVIEW: "En attente d'avis du responsable",
  MANAGER_REJECTED: 'Avis défavorable du responsable',
  PENDING_ASSIGNMENT: 'Transmise à la SDAG',
  ASSIGNED: 'En cours de traitement SDAG',
  RETURNED_TO_SDAG_DIRECTOR: 'En attente de décision SDAG',
  APPROVED: 'Approuvée',
  REJECTED: 'Rejetée',
};

export const REQUEST_STATUS_COLORS: Record<RequestStatus, 'default' | 'info' | 'success' | 'warning' | 'error' | 'secondary'> = {
  DRAFT: 'default',
  PENDING_MANAGER_REVIEW: 'info',
  MANAGER_REJECTED: 'error',
  PENDING_ASSIGNMENT: 'secondary',
  ASSIGNED: 'secondary',
  RETURNED_TO_SDAG_DIRECTOR: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

export const ROLE_LABELS: Record<Role, string> = {
  AGENT: 'Agent',
  RESPONSABLE_HIERARCHIQUE: 'Responsable hiérarchique',
  SOUS_DIRECTEUR_SDAG: 'Sous-Directeur des Affaires Générales',
  AGENT_TRAITEMENT_SDAG: 'Agent de traitement SDAG',
  ADMIN: 'Administrateur',
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

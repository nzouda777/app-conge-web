// Libellés en clair des codes d'action du journal d'audit. Un administrateur
// n'a pas à connaître `ADMIN_PROVISIONAL_PASSWORDS_ISSUED` pour lire son
// journal — et un code brut rend l'écran inutilisable pour un contrôle.
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Connexion',
  LOGIN_FAILED: 'Échec de connexion',
  LOGIN_LOCKED: 'Compte bloqué après échecs répétés',
  SURFACE_REJECTED: 'Connexion refusée sur la mauvaise interface',
  PASSWORD_CHANGED: 'Mot de passe modifié par son titulaire',
  PASSWORD_CHANGE_FAILED: 'Changement de mot de passe refusé',
  STEP_UP_FAILED: 'Ré-authentification refusée avant une action sensible',

  REQUEST_CREATED: 'Demande créée',
  REQUEST_UPDATED: 'Brouillon modifié',
  REQUEST_SUBMITTED: 'Demande soumise',
  MANAGER_REVIEW: 'Avis hiérarchique rendu',
  SDAG_ASSIGNMENT: 'Dossier coté à un agent de traitement',
  FINAL_DECISION: 'Décision finale',
  DECISION_CANCELLED: 'Décision annulée',

  ATTACHMENT_UPLOADED: 'Pièce jointe déposée',
  ATTACHMENT_DELETED: 'Pièce jointe retirée',
  ATTACHMENT_DOWNLOADED: 'Pièce jointe téléchargée',
  DOCUMENT_DOWNLOADED: 'Document téléchargé',

  ADMIN_USER_CREATED: 'Compte créé',
  ADMIN_USER_UPDATED: 'Compte modifié',
  ADMIN_ROLE_CHANGED: 'Rôle modifié',
  ADMIN_USER_DEACTIVATED: 'Compte désactivé',
  ADMIN_USER_REACTIVATED: 'Compte réactivé',
  ADMIN_USER_DELETED: 'Compte supprimé',
  ADMIN_PASSWORD_RESET: 'Mot de passe réinitialisé par l’administration',
  ADMIN_PROVISIONAL_PASSWORDS_ISSUED: 'Mots de passe provisoires réémis',
  ADMIN_REQUEST_DELETED: 'Demande supprimée',
  ADMIN_ATTACHMENT_DELETED: 'Pièce jointe supprimée',
  ADMIN_REQUESTS_PURGED: 'Purge totale des demandes',
  ADMIN_DECISION_UPSERTED: 'Décision ministérielle enregistrée',
  ADMIN_PERSONNEL_IMPORTED: 'Fichier personnel importé',
  ADMIN_PERSONNEL_IMPORT_SIMULATED: 'Import du fichier personnel simulé',
  PROCESSING_TARGETS_UPDATED: 'Délais cibles modifiés',
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  User: 'Compte',
  LeaveRequest: 'Demande',
  Attachment: 'Pièce jointe',
  Employee: 'Agent',
  AnnualLeaveDecision: 'Décision ministérielle',
  ProcessingTarget: 'Délai cible',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function auditEntityLabel(entityType: string): string {
  return AUDIT_ENTITY_LABELS[entityType] ?? entityType;
}

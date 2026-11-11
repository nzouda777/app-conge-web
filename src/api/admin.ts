import { apiClient } from './client';
import type {
  AdminEmployee,
  AdminUser,
  AnnualLeaveDecision,
  AuditDigest,
  AuditEntry,
  AuditFacets,
  EmployeeStatus,
  LeaveRequest,
  Paginated,
  ProvisionalCredential,
  Role,
} from '../types/api';

// Les opérations d'administration qui détruisent des données ou redistribuent
// des droits exigent le mot de passe de l'administrateur, en plus de sa
// session : une session ouverte sur un poste laissé sans surveillance ne doit
// pas suffire.
export interface StepUpInput {
  confirmPassword: string;
}

export interface CreateUserInput extends StepUpInput {
  employeeId?: string;
  matricule?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  status?: EmployeeStatus;
  organizationUnitId?: string;
  managerId?: string;
  hireDate?: string;
  email: string;
  role: Role;
  // Plus de `password` : l'administrateur ne choisit plus le mot de passe d'un
  // compte. Le serveur en génère un, provisoire et aléatoire, et le renvoie
  // une seule fois — sans quoi l'administrateur pourrait ouvrir une session au
  // nom d'un agent et agir sous son identité, le dossier portant la signature
  // de la victime.
}

export interface UpdateUserInput extends StepUpInput {
  email?: string;
  role?: Role;
  employee?: {
    firstName?: string;
    lastName?: string;
    position?: string;
    status?: EmployeeStatus;
    organizationUnitId?: string;
    managerId?: string;
  };
}

// Effectif, paginé. La version précédente renvoyait les 1 500 fiches d'un
// bloc avec leur structure et leur supérieur.
export async function listAdminEmployees(params?: {
  search?: string;
  withoutUser?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await apiClient.get<{
    items: AdminEmployee[];
    total: number;
    page: number;
    pageSize: number;
  }>('/admin/employees', { params: { pageSize: 100, ...params } });
  return data;
}

export type AdminUserSortField = 'name' | 'matricule' | 'role' | 'unit' | 'hireDate';

export interface ListAdminUsersParams {
  search?: string;
  role?: Role;
  status?: 'CIVIL_SERVANT' | 'LABOUR_CODE';
  organizationUnitId?: string;
  sortBy?: AdminUserSortField;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function listAdminUsers(params?: ListAdminUsersParams) {
  const { data } = await apiClient.get<{
    items: AdminUser[];
    total: number;
    page: number;
    pageSize: number;
  }>('/admin/users', { params });
  return data;
}

// Mise à jour du fichier personnel depuis un classeur Excel. L'import est
// idempotent : il crée ce qui manque, met à jour ce qui a changé, et ne
// supprime rien.
export interface PersonnelImportReport {
  // true = simulation : le rapport décrit ce que l'import ferait, rien n'a
  // été écrit en base.
  dryRun: boolean;
  sheet: string;
  totalRows: number;
  importedEmployees: number;
  createdEmployees: number;
  updatedEmployees: number;
  createdUsers: number;
  updatedUsers: number;
  organizationUnits: number;
  roleChanges: { matricule: string; name: string; from: string; to: string }[];
  skipped: { row: number; matricule: string; name: string; poste: string; structure: string; reason: string }[];
  unresolvedSupervisors: { matricule: string; name: string; level: number; reference: string }[];
  withoutHierarchy: { matricule: string; name: string; poste: string }[];
  codeCollisions: { code: string; keptFor: string; renamedTo: string; unit: string }[];
  // Agents rattachés à une unité de repli faute de structure résolue. C'était
  // silencieux : la fiche atterrissait dans une structure arbitraire.
  fallbackUnitAssignments: { matricule: string; name: string; structure: string; assignedTo: string }[];
  // Comptes actifs dont l'agent ne figure pas dans le fichier — typiquement des
  // départs. Listés, jamais désactivés d'office : un fichier partiel ferait
  // sortir tout le reste de l'effectif.
  accountsAbsentFromFile: { matricule: string; name: string; email: string; lastLoginAt: string | null }[];
  // Mots de passe provisoires des comptes créés, renvoyés UNE SEULE FOIS.
  credentials: ProvisionalCredential[];
  // Document de distribution prêt à enregistrer, en PDF encodé base64,
  // classé par direction. Produit par le serveur.
  credentialsPdf: string | null;
}

// `dryRun` prévisualise sans rien écrire : l'import APPLIQUAIT les changements
// de rôle puis les signalait dans son rapport — dans cet ordre. Une cellule mal
// saisie promouvait ou rétrogradait silencieusement un Sous-Directeur, et
// l'administrateur ne le découvrait qu'après coup.
export async function importPersonnelFile(
  file: File,
  options: { dryRun?: boolean; confirmPassword?: string } = {},
  onProgress?: (pct: number) => void,
) {
  const form = new FormData();
  form.append('file', file);
  if (options.dryRun) form.append('dryRun', 'true');
  // Ré-authentification exigée pour l'APPLICATION : un import crée des
  // centaines de comptes et redistribue des rôles. La simulation en est
  // dispensée — elle n'écrit rien.
  form.append('confirmPassword', options.confirmPassword ?? '');
  const { data } = await apiClient.post<PersonnelImportReport>('/admin/personnel/import', form, {
    // Un import porte plus de 1500 lignes : on laisse largement le temps au
    // serveur, faute de quoi le navigateur abandonne une opération qui, elle,
    // ira à son terme.
    timeout: 180_000,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
}

// Renvoie le compte créé ET son mot de passe provisoire, à remettre à
// l'intéressé. Celui-ci n'est jamais stocké en clair : s'il est perdu, il faut
// le réémettre.
export async function createAdminUser(input: CreateUserInput) {
  const { data } = await apiClient.post<{
    user: AdminUser;
    credential: ProvisionalCredential;
    // Document de distribution, produit par le serveur et encodé en base64 :
    // les mots de passe ne transitent qu'une fois, dans cette réponse.
    credentialsPdf: string;
  }>('/admin/users', input);
  return data;
}

export async function updateAdminUser(id: string, input: UpdateUserInput) {
  const { data } = await apiClient.patch<AdminUser>(`/admin/users/${id}`, input);
  return data;
}

export async function deactivateAdminUser(id: string) {
  const { data } = await apiClient.post<AdminUser>(`/admin/users/${id}/deactivate`);
  return data;
}

export async function reactivateAdminUser(id: string) {
  const { data } = await apiClient.post<AdminUser>(`/admin/users/${id}/reactivate`);
  return data;
}

// Réémet un mot de passe provisoire aléatoire et le renvoie une seule fois.
// L'administrateur ne le choisit pas.
export async function resetAdminUserPassword(id: string, confirmPassword: string) {
  const { data } = await apiClient.post<{
    credential: ProvisionalCredential;
    credentialsPdf: string;
  }>(`/admin/users/${id}/reset-password`, { confirmPassword });
  return data;
}

// Réémission groupée, pour les comptes jamais activés — au lendemain d'un
// import dont la liste imprimée a été perdue.
export async function reissueProvisionalPasswords(confirmPassword: string) {
  const { data } = await apiClient.post<{
    issued: number;
    credentials: ProvisionalCredential[];
    credentialsPdf: string;
  }>('/admin/users/reissue-provisional-passwords', { confirmPassword }, { timeout: 300_000 });
  return data;
}

export async function deleteAdminUser(id: string, confirmPassword: string) {
  const { data } = await apiClient.delete(`/admin/users/${id}`, { data: { confirmPassword } });
  return data;
}

export async function listAdminRequests(params: { page?: number; pageSize?: number; status?: string }) {
  const { data } = await apiClient.get<Paginated<LeaveRequest>>('/requests', { params });
  return data;
}

export async function deleteAdminRequest(id: string, confirmPassword: string) {
  const { data } = await apiClient.delete(`/admin/requests/${id}`, { data: { confirmPassword } });
  return data;
}

export async function deleteAdminAttachment(
  requestId: string,
  attachmentId: string,
  confirmPassword: string,
) {
  const { data } = await apiClient.delete(`/admin/requests/${requestId}/attachments/${attachmentId}`, {
    data: { confirmPassword },
  });
  return data;
}

// Phrase exacte à recopier pour confirmer la purge, reprise de l'API
// (PURGE_CONFIRMATION_PHRASE). Un bouton se clique par réflexe ; une phrase se
// recopie délibérément.
export const PURGE_CONFIRMATION_PHRASE = 'SUPPRIMER TOUTES LES DEMANDES';

// Trois barrières là où un simple `{ confirm: true }` suffisait à effacer
// l'historique complet des décisions de congé de la Direction.
export async function purgeAllRequests(confirmPassword: string) {
  const { data } = await apiClient.delete<{ deletedRequests: number; deletedAttachments: number }>(
    '/admin/requests',
    {
      data: {
        confirmPassword,
        confirmationPhrase: PURGE_CONFIRMATION_PHRASE,
        acknowledgeIrreversible: true,
      },
    },
  );
  return data;
}

export async function listAnnualLeaveDecisions(year?: number) {
  const { data } = await apiClient.get<AnnualLeaveDecision[]>('/admin/annual-leave-decisions', {
    params: year ? { year } : {},
  });
  return data;
}

export async function upsertAnnualLeaveDecision(input: {
  year: number;
  category: EmployeeStatus;
  number: string;
  date: string;
}) {
  const { data } = await apiClient.put<AnnualLeaveDecision>('/admin/annual-leave-decisions', input);
  return data;
}

// Délais cibles de traitement, par étape. Une étape absente de la liste n'est
// pas contrôlée : les indicateurs de retard restent vides.
export type TargetStage = 'HIERARCHY' | 'ASSIGNMENT' | 'TREATMENT' | 'TOTAL';

export interface ProcessingTarget {
  stage: TargetStage;
  days: number;
  updatedAt: string;
}

export async function listProcessingTargets() {
  const { data } = await apiClient.get<ProcessingTarget[]>('/admin/processing-targets');
  return data;
}

export async function saveProcessingTargets(targets: { stage: TargetStage; days: number }[]) {
  const { data } = await apiClient.put<ProcessingTarget[]>('/admin/processing-targets', { targets });
  return data;
}

// ---------------------------------------------------------------------------
// Journal d'audit
// ---------------------------------------------------------------------------


export interface AuditQueryParams {
  action?: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchAuditDigest() {
  const { data } = await apiClient.get<AuditDigest>('/admin/audit/digest');
  return data;
}

export async function fetchAuditFacets() {
  const { data } = await apiClient.get<AuditFacets>('/admin/audit/facets');
  return data;
}

export async function listAuditEntries(params: AuditQueryParams) {
  const { data } = await apiClient.get<{
    items: AuditEntry[];
    total: number;
    page: number;
    pageSize: number;
  }>('/admin/audit', { params });
  return data;
}

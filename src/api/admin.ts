import { apiClient } from './client';
import type {
  AdminEmployee,
  AdminUser,
  AnnualLeaveDecision,
  EmployeeStatus,
  LeaveRequest,
  Paginated,
  Role,
} from '../types/api';

export interface CreateUserInput {
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
  password: string;
}

export interface UpdateUserInput {
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

export async function listAdminEmployees() {
  const { data } = await apiClient.get<AdminEmployee[]>('/admin/employees');
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
}

export async function importPersonnelFile(file: File, onProgress?: (pct: number) => void) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<PersonnelImportReport>('/admin/personnel/import', form, {
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
}

export async function createAdminUser(input: CreateUserInput) {
  const { data } = await apiClient.post<AdminUser>('/admin/users', input);
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

export async function resetAdminUserPassword(id: string, newPassword: string) {
  const { data } = await apiClient.post(`/admin/users/${id}/reset-password`, { newPassword });
  return data;
}

export async function deleteAdminUser(id: string) {
  const { data } = await apiClient.delete(`/admin/users/${id}`);
  return data;
}

export async function listAdminRequests(params: { page?: number; pageSize?: number; status?: string }) {
  const { data } = await apiClient.get<Paginated<LeaveRequest>>('/requests', { params });
  return data;
}

export async function deleteAdminRequest(id: string) {
  const { data } = await apiClient.delete(`/admin/requests/${id}`);
  return data;
}

export async function deleteAdminAttachment(requestId: string, attachmentId: string) {
  const { data } = await apiClient.delete(`/admin/requests/${requestId}/attachments/${attachmentId}`);
  return data;
}

export async function purgeAllRequests() {
  const { data } = await apiClient.delete<{ deletedRequests: number; deletedAttachments: number }>(
    '/admin/requests',
    { data: { confirm: true } },
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

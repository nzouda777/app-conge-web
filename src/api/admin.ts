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

export async function listAdminUsers(params?: { search?: string; role?: Role }) {
  const { data } = await apiClient.get<{ items: AdminUser[]; total: number }>('/admin/users', { params });
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

import { apiClient } from './client';
import type { AppNotification, Employee, Paginated, QuotaSummary } from '../types/api';

export async function fetchQuotaSummary(year?: number) {
  const { data } = await apiClient.get<QuotaSummary>('/quotas/me', { params: year ? { year } : {} });
  return data;
}

export async function listEmployees(params?: { search?: string; role?: string }) {
  const { data } = await apiClient.get<Paginated<Employee>>('/employees', {
    params: { search: params?.search, role: params?.role, pageSize: 50 },
  });
  return data;
}

export async function fetchSubordinates() {
  const { data } = await apiClient.get<Employee[]>('/employees/subordinates');
  return data;
}

// Liste paginée. Le plafond était fixe à 100 sans pagination : au-delà,
// l'historique des notifications devenait inaccessible.
export async function listNotifications(
  unreadOnly = false,
  params: { page?: number; pageSize?: number } = {},
) {
  const { data } = await apiClient.get<{
    items: AppNotification[];
    total: number;
    unread: number;
    page: number;
    pageSize: number;
  }>('/notifications', {
    params: { ...(unreadOnly ? { unread: 'true' } : {}), ...params },
  });
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.post<{ marked: number }>('/notifications/read-all');
  return data;
}

export async function markNotificationRead(id: string) {
  const { data } = await apiClient.patch<AppNotification>(`/notifications/${id}/read`);
  return data;
}

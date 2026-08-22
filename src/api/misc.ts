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

export async function listNotifications(unreadOnly = false) {
  const { data } = await apiClient.get<AppNotification[]>('/notifications', {
    params: unreadOnly ? { unread: 'true' } : {},
  });
  return data;
}

export async function markNotificationRead(id: string) {
  const { data } = await apiClient.patch<AppNotification>(`/notifications/${id}/read`);
  return data;
}

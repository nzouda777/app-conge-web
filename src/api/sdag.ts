import { apiClient } from './client';
import type { LeaveRequest, Paginated, RequestStatus } from '../types/api';

export async function listSdagRequests(params: { status?: RequestStatus; page?: number; pageSize?: number }) {
  const { data } = await apiClient.get<Paginated<LeaveRequest>>('/sdag/requests', { params });
  return data;
}

export async function assignRequest(id: string, assigneeId: string) {
  const { data } = await apiClient.post<LeaveRequest>(`/sdag/requests/${id}/assign`, { assigneeId });
  return data;
}

export async function submitTreatment(id: string, observation?: string) {
  const { data } = await apiClient.post<LeaveRequest>(`/sdag/requests/${id}/treatment`, { observation });
  return data;
}

export async function submitDecision(id: string, decision: 'APPROVED' | 'REJECTED', comment?: string) {
  const { data } = await apiClient.post<LeaveRequest>(`/sdag/requests/${id}/decision`, { decision, comment });
  return data;
}

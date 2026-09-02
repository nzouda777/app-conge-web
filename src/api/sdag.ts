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

// Validation / rejet by the agent de traitement holding the dossier. The
// former submitTreatment (retour au Sous-Directeur pour avis) is gone: the
// agent's study notes now ride along with the decision as `observation`.
export async function submitDecision(
  id: string,
  decision: 'APPROVED' | 'REJECTED',
  comment?: string,
  observation?: string,
) {
  const { data } = await apiClient.post<LeaveRequest>(`/sdag/requests/${id}/decision`, {
    decision,
    comment,
    observation,
  });
  return data;
}

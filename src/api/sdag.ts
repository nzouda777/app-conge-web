import { apiClient } from './client';
import type { LeaveRequest, Paginated, RequestStatus } from '../types/api';

export async function listSdagRequests(params: {
  status?: RequestStatus;
  // Plusieurs statuts pour un même onglet : « Rejetées » réunit l'avis
  // défavorable d'un supérieur et le rejet par l'agent de traitement.
  statuses?: RequestStatus[];
  page?: number;
  pageSize?: number;
}) {
  const { data } = await apiClient.get<Paginated<LeaveRequest>>('/sdag/requests', {
    params: { ...params, statuses: params.statuses?.join(',') },
  });
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

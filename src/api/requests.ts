import { apiClient } from './client';
import type { Attachment, LeaveRequest, Paginated, PermissionSubType, RequestStatus, RequestType } from '../types/api';

export interface CreateRequestInput {
  type: RequestType;
  permissionSubType?: PermissionSubType;
  startDate: string;
  endDate: string;
  motif?: string;
  interimEmployeeId?: string;
  relatedRequestId?: string;
  repriseNoteNumber?: string;
  repriseNoteDate?: string;
  reprisePriorType?: string;
  reprisePriorStartDate?: string;
  reprisePriorEndDate?: string;
}

export async function createRequest(input: CreateRequestInput) {
  const { data } = await apiClient.post<LeaveRequest>('/requests', input);
  return data;
}

export async function updateRequest(id: string, input: Partial<CreateRequestInput>) {
  const { data } = await apiClient.patch<LeaveRequest>(`/requests/${id}`, input);
  return data;
}

export async function submitRequest(id: string) {
  const { data } = await apiClient.post<LeaveRequest>(`/requests/${id}/submit`);
  return data;
}

export async function getRequest(id: string) {
  const { data } = await apiClient.get<LeaveRequest>(`/requests/${id}`);
  return data;
}

export async function listRequests(params: {
  status?: RequestStatus;
  type?: RequestType;
  year?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await apiClient.get<Paginated<LeaveRequest>>('/requests', { params });
  return data;
}

export async function managerReview(id: string, decision: 'FAVORABLE' | 'DEFAVORABLE', comment?: string) {
  const { data } = await apiClient.post<LeaveRequest>(`/requests/${id}/manager-review`, { decision, comment });
  return data;
}

export async function uploadAttachment(requestId: string, file: File, onProgress?: (percent: number) => void) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<Attachment>(`/requests/${requestId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
    },
  });
  return data;
}

export async function deleteAttachment(requestId: string, attachmentId: string) {
  const { data } = await apiClient.delete(`/requests/${requestId}/attachments/${attachmentId}`);
  return data;
}

export function attachmentDownloadUrl(requestId: string, attachmentId: string) {
  return `${apiClient.defaults.baseURL}/requests/${requestId}/attachments/${attachmentId}`;
}

export function requestDocumentUrl(requestId: string) {
  return `${apiClient.defaults.baseURL}/requests/${requestId}/document`;
}

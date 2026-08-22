import { apiClient } from './client';
import type { AuthUser } from '../types/api';

export async function login(matricule: string, password: string) {
  const { data } = await apiClient.post<AuthUser>('/auth/login', { matricule, password });
  return data;
}

export async function logout() {
  await apiClient.post('/auth/logout');
}

export async function fetchMe() {
  const { data } = await apiClient.get<AuthUser>('/auth/me');
  return data;
}

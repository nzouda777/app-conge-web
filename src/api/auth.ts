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

// Changement de mot de passe par le titulaire du compte. Le mot de passe
// actuel est exigé côté serveur : une session laissée ouverte ne doit pas
// suffire à s'approprier le compte.
export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await apiClient.post<{ success: boolean }>('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return data;
}

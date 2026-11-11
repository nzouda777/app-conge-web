import { apiClient } from './client';
import type { AuthUser } from '../types/api';

// Deux points d'entrée de connexion, un par interface. Le serveur refuse un
// compte d'administration sur l'interface du personnel et inversement : la
// séparation n'est pas qu'un habillage, elle est appliquée côté API.
export async function login(matricule: string, password: string, surface: 'agent' | 'admin' = 'agent') {
  const path = surface === 'admin' ? '/auth/admin/login' : '/auth/login';
  const { data } = await apiClient.post<AuthUser>(path, { matricule, password });
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
// suffire à s'approprier le compte. Le changement révoque par ailleurs toutes
// les sessions du compte, y compris celle-ci.
export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await apiClient.post<{ success: boolean }>('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return data;
}

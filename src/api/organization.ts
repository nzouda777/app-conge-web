import { apiClient } from './client';
import type { OrganizationUnit } from '../types/api';

export async function listOrganizationUnits() {
  const { data } = await apiClient.get<OrganizationUnit[]>('/organization-units');
  return data;
}

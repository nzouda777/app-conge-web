import axios from 'axios';
import type { ApiError } from '../types/api';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  withCredentials: true,
});

export function getApiErrorMessage(error: unknown, fallback = "Une erreur est survenue."): string {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}

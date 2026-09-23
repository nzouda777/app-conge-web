import axios from 'axios';
import type { ApiError } from '../types/api';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  withCredentials: true,
});

// Un échec peut venir de trois endroits, et les confondre laisse l'utilisateur
// sans prise : l'application (message métier), la couche HTTP (passerelle,
// délai dépassé, requête trop volumineuse), ou le réseau. On nomme chacun.
export function getApiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (!axios.isAxiosError<ApiError>(error)) return fallback;

  // Le serveur a répondu quelque chose d'exploitable.
  const data = error.response?.data as ApiError | { message?: string | string[] } | undefined;
  const raw = data?.message;
  if (Array.isArray(raw) && raw.length > 0) return raw.join(' · ');
  if (typeof raw === 'string' && raw.trim()) return raw;

  if (error.code === 'ECONNABORTED') {
    return "Le serveur n'a pas répondu dans le délai imparti. L'opération est peut-être encore en cours : rechargez la page dans une minute avant de réessayer.";
  }
  if (!error.response) {
    return "Le serveur est injoignable. Vérifiez votre connexion, puis réessayez.";
  }

  // Le serveur a répondu, mais rien d'exploitable : on rend au moins le code,
  // qui oriente le diagnostic.
  const status = error.response.status;
  const byStatus: Record<number, string> = {
    401: 'Votre session a expiré. Reconnectez-vous.',
    403: "Vous n'avez pas les droits pour cette action.",
    413: 'Le fichier envoyé est trop volumineux pour le serveur.',
    502: "Le serveur applicatif n'a pas répondu (passerelle). Il a peut-être redémarré ou dépassé son temps de traitement.",
    503: 'Le service est momentanément indisponible. Réessayez dans quelques instants.',
    504: "Le traitement a dépassé le délai autorisé par la passerelle. L'opération est peut-être allée à son terme : vérifiez avant de réessayer.",
  };
  return byStatus[status] ?? `${fallback} (erreur HTTP ${status})`;
}

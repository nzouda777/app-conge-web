import axios from 'axios';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types/api';

// Surface servie par ce bundle. Les deux interfaces vivent sur deux origines
// distinctes et ont chacune leur page de connexion : le client doit savoir
// laquelle, pour y ramener l'utilisateur quand sa session tombe.
export type AppSurface = 'agent' | 'admin';

export const APP_SURFACE: AppSurface =
  (import.meta.env.VITE_APP_SURFACE as AppSurface | undefined) ?? 'agent';

export const LOGIN_PATH = APP_SURFACE === 'admin' ? '/admin-login' : '/login';

// Délai d'expiration par défaut. Il n'y en avait AUCUN : une requête suspendue
// laissait tourner un indicateur de chargement indéfiniment, et la branche
// « le serveur n'a pas répondu dans le délai imparti » soigneusement rédigée
// plus bas était donc inatteignable. Les opérations longues (import du fichier
// personnel) posent le leur, plus généreux.
const DEFAULT_TIMEOUT_MS = 20_000;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT_MS,
});

// ---------------------------------------------------------------------------
// Session expirée
// ---------------------------------------------------------------------------

type UnauthenticatedHandler = (reason: 'EXPIRED' | 'PASSWORD_CHANGE_REQUIRED') => void;
let onUnauthenticated: UnauthenticatedHandler | null = null;

// Posé par l'application au démarrage. Sans cet accrochage, une 401 en cours
// de session ne provoquait ni déconnexion ni redirection : l'utilisateur
// restait sur une page qui affichait « Votre session a expiré » écran après
// écran, sans jamais être ramené à la connexion. L'application ne se comportait
// pas comme déconnectée, mais comme cassée.
export function setUnauthenticatedHandler(handler: UnauthenticatedHandler | null) {
  onUnauthenticated = handler;
}

// Une 401 ne signifie pas toujours « session tombée ».
//
// Deux cas où elle est une réponse MÉTIER, attendue, et ne doit surtout pas
// déconnecter :
//   - un mot de passe refusé sur un point d'entrée d'authentification ;
//   - une ré-authentification manquée avant une action destructive
//     (STEP_UP_FAILED) — elle arrive sur /admin/..., pas sur /auth/..., et la
//     session reste parfaitement valide côté serveur.
//
// Le filtrage se fait donc sur le CODE d'erreur et non sur le chemin. Filtrer
// par chemin laissait passer STEP_UP_FAILED : une simple faute de frappe dans
// la confirmation d'une suppression éjectait l'administrateur de sa console,
// sans qu'il puisse lire le message lui disant que son mot de passe était faux.
const BUSINESS_401_CODES = new Set([
  'INVALID_CREDENTIALS',
  'ACCOUNT_LOCKED',
  'INVALID_CURRENT_PASSWORD',
  'STEP_UP_FAILED',
]);

const AUTH_PATHS = ['/auth/login', '/auth/admin/login', '/auth/change-password', '/auth/me'];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const code = error.response?.data?.code;

    const isBusiness401 =
      (code !== undefined && BUSINESS_401_CODES.has(code)) ||
      AUTH_PATHS.some((p) => url.startsWith(p));

    if (status === 401 && !isBusiness401) {
      onUnauthenticated?.('EXPIRED');
    }
    // Mot de passe provisoire non changé : l'API refuse tout le reste. On
    // conduit l'utilisateur à l'écran de changement au lieu de lui montrer une
    // succession d'erreurs d'autorisation.
    if (status === 403 && code === 'PASSWORD_CHANGE_REQUIRED') {
      onUnauthenticated?.('PASSWORD_CHANGE_REQUIRED');
    }

    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Reprise sur erreur réseau passagère
// ---------------------------------------------------------------------------

// `retry: false` était posé globalement sur TanStack Query : aucune reprise,
// même sur une coupure réseau d'une seconde. Sur un réseau administratif
// instable, cela se traduit par des écrans en erreur là où un seul essai
// supplémentaire aurait suffi.
//
// Ne sont reprises que les LECTURES, et seulement sur une panne de transport ou
// une erreur serveur — jamais une erreur métier (4xx), et jamais une écriture,
// dont on ne sait pas si elle a abouti.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (!axios.isAxiosError(error)) return false;
  if (!error.response) return true; // réseau coupé, délai dépassé
  return error.response.status >= 500 && error.response.status !== 501;
}

// ---------------------------------------------------------------------------
// Messages d'erreur
// ---------------------------------------------------------------------------

// Un échec peut venir de trois endroits, et les confondre laisse l'utilisateur
// sans prise : l'application (message métier), la couche HTTP (passerelle,
// délai dépassé, requête trop volumineuse), ou le réseau. On nomme chacun.
export function getApiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (!axios.isAxiosError<ApiError>(error)) return fallback;

  // Le serveur a répondu quelque chose d'exploitable.
  const data = error.response?.data as ApiError | { message?: string | string[] } | undefined;
  const raw = data?.message;
  if (Array.isArray(raw) && raw.length > 0) return raw.join(' · ');
  if (typeof raw === 'string' && raw.trim()) {
    // L'identifiant de corrélation permet à l'utilisateur de citer un code
    // précis, et à l'administrateur de retrouver la requête exacte dans le
    // journal d'audit plutôt que de chercher à l'aveugle.
    const requestId = (data as ApiError | undefined)?.requestId;
    const isInternal = (data as ApiError | undefined)?.code === 'INTERNAL_ERROR';
    return isInternal && requestId ? `${raw} (référence : ${requestId})` : raw;
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return "Le serveur n'a pas répondu dans le délai imparti. L'opération est peut-être encore en cours : rechargez la page dans une minute avant de réessayer.";
  }
  if (!error.response) {
    return 'Le serveur est injoignable. Vérifiez votre connexion, puis réessayez.';
  }

  // Le serveur a répondu, mais rien d'exploitable : on rend au moins le code,
  // qui oriente le diagnostic.
  const status = error.response.status;
  const byStatus: Record<number, string> = {
    401: 'Votre session a expiré. Reconnectez-vous.',
    403: "Vous n'avez pas les droits pour cette action.",
    413: 'Le fichier envoyé est trop volumineux pour le serveur.',
    429: 'Trop de requêtes en peu de temps. Patientez un instant avant de réessayer.',
    502: "Le serveur applicatif n'a pas répondu (passerelle). Il a peut-être redémarré ou dépassé son temps de traitement.",
    503: 'Le service est momentanément indisponible. Réessayez dans quelques instants.',
    504: "Le traitement a dépassé le délai autorisé par la passerelle. L'opération est peut-être allée à son terme : vérifiez avant de réessayer.",
  };
  return byStatus[status] ?? `${fallback} (erreur HTTP ${status})`;
}

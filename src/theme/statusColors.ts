import type { AuthUser, LeaveRequest, RequestStatus } from '../types/api';

// ---------------------------------------------------------------------------
// Système de couleurs de l'application, appliqué partout : badges, listes,
// fiche de demande, tableau de bord.
//
//   bleu   - dossier en cours dans le circuit, rien à faire pour vous
//   orange - VOUS avez une action à effectuer sur ce dossier
//   vert   - demande signée, traitement abouti
//   rouge  - avis défavorable, dossier arrêté
//   neutre - brouillon non soumis, ou étape sans signification particulière
//
// L'orange est le seul à dépendre de qui regarde : c'est le point du système.
// Le tableau de bord, lui, raisonne sur l'ensemble de la Direction Générale et
// utilise donc `statusTone` seul, sans contexte utilisateur.
// ---------------------------------------------------------------------------

export type Tone = 'neutral' | 'progress' | 'action' | 'success' | 'danger';

export const TONE_COLORS: Record<Tone, { main: string; soft: string; text: string }> = {
  neutral: { main: '#9AA7B4', soft: '#F2F4F7', text: '#5D6D7E' },
  progress: { main: '#2E86C1', soft: '#EBF5FB', text: '#1B4F72' },
  action: { main: '#E08A1E', soft: '#FDF3E3', text: '#9C5B00' },
  success: { main: '#2E9E6B', soft: '#E9F7F0', text: '#1E6B48' },
  danger: { main: '#C0392B', soft: '#FDEDEC', text: '#922B21' },
};

// Teinte intrinsèque d'un statut, indépendamment de qui regarde.
export function statusTone(status: RequestStatus): Tone {
  switch (status) {
    case 'DRAFT':
      return 'neutral';
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
    case 'MANAGER_REJECTED':
      return 'danger';
    default:
      // PENDING_MANAGER_REVIEW, PENDING_ASSIGNMENT, ASSIGNED,
      // RETURNED_TO_SDAG_DIRECTOR : le dossier avance dans le circuit.
      return 'progress';
  }
}

type RequestLike = Pick<LeaveRequest, 'status' | 'employeeId' | 'currentAssigneeId'> & {
  currentHierarchyLevel?: number | null;
  employee?: { managerId?: string | null; supervisors?: { level: number; supervisorId: string }[] };
};

// L'utilisateur connecté doit-il agir sur ce dossier ?
//   - le demandeur sur son propre brouillon : non, un brouillon reste neutre ;
//   - le supérieur du niveau en cours : il doit rendre son avis ;
//   - le Sous-Directeur SDAG : il doit coter un dossier transmis ;
//   - l'agent de traitement affecté : il doit téléverser et statuer.
export function requiresActionFrom(request: RequestLike, user: AuthUser | null | undefined): boolean {
  if (!user) return false;

  if (request.status === 'PENDING_MANAGER_REVIEW') {
    const level = request.currentHierarchyLevel ?? 1;
    const expected =
      request.employee?.supervisors?.find((s) => s.level === level)?.supervisorId ??
      request.employee?.managerId ??
      null;
    return expected === user.employeeId;
  }
  if (request.status === 'PENDING_ASSIGNMENT') {
    return user.role === 'SOUS_DIRECTEUR_SDAG';
  }
  if (request.status === 'ASSIGNED') {
    return request.currentAssigneeId === user.employeeId;
  }
  return false;
}

// Teinte affichée à un utilisateur donné : l'orange prime sur le bleu quand
// c'est à lui de jouer.
export function requestTone(request: RequestLike, user: AuthUser | null | undefined): Tone {
  return requiresActionFrom(request, user) ? 'action' : statusTone(request.status);
}

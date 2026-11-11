import type { AuthUser, LeaveRequest, RequestStatus } from '../types/api';
import { tokens } from './tokens';

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

// Teintes dérivées des jetons, et non d'une seconde palette : il y avait ici
// quinze valeurs écrites en dur, en parallèle de theme/tokens.ts, ce qui rendait
// toute correction de contraste incomplète par construction.
//
//   `text` sur `soft` porte l'information et respecte le seuil AA de 4,5:1
//          (mesuré : 4,8 à 7,9 selon la teinte) ;
//   `main` n'est utilisé qu'en bordure à 20 % d'opacité — décoratif, le sens
//          étant déjà porté par le libellé du badge.
export const TONE_COLORS: Record<Tone, { main: string; soft: string; text: string }> = {
  neutral: { main: tokens.inkMuted, soft: tokens.surfaceSunk, text: tokens.inkSecondary },
  progress: { main: tokens.accentFill, soft: tokens.infoSoft, text: tokens.brand },
  action: { main: tokens.warningFill, soft: tokens.warningSoft, text: tokens.warningText },
  success: { main: tokens.successFill, soft: tokens.successSoft, text: tokens.successText },
  danger: { main: tokens.dangerFill, soft: tokens.dangerSoft, text: tokens.dangerText },
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

type SupervisorLike = {
  level: number;
  supervisorId: string;
  supervisor?: { firstName: string; lastName: string; position: string };
};

type RequestLike = Pick<LeaveRequest, 'status' | 'employeeId' | 'currentAssigneeId'> & {
  currentHierarchyLevel?: number | null;
  employee?: { managerId?: string | null; supervisors?: SupervisorLike[] };
};

// Le supérieur dont l'avis est attendu au niveau en cours. Permet d'afficher
// de qui l'on attend quelque chose, plutôt que le seul constat qu'un avis
// manque.
export function expectedReviewer(request: RequestLike): SupervisorLike | null {
  if (request.status !== 'PENDING_MANAGER_REVIEW') return null;
  const level = request.currentHierarchyLevel ?? 1;
  return request.employee?.supervisors?.find((sv) => sv.level === level) ?? null;
}

// « Poste, Prénom NOM » du supérieur attendu, ou null si la chaîne ne permet
// pas de l'identifier.
export function expectedReviewerLabel(request: RequestLike): string | null {
  const sv = expectedReviewer(request);
  if (!sv?.supervisor) return null;
  const { position, firstName, lastName } = sv.supervisor;
  return `${position}, ${firstName} ${lastName}`;
}

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

// Ce que l'utilisateur doit faire, quand c'est à lui. Ce texte REMPLACE le
// libellé de statut sur le badge : un dossier orange doit dire l'acte à poser,
// pas l'endroit où il se trouve. Deux personnes peuvent donc lire deux textes
// différents sur le même dossier - c'est voulu, elles n'ont pas le même rôle
// à y jouer.
const ACTION_LABELS: Partial<Record<RequestStatus, string>> = {
  PENDING_MANAGER_REVIEW: 'Votre avis est attendu',
  PENDING_ASSIGNMENT: 'À coter',
  ASSIGNED: 'À traiter et signer',
};

export function actionLabel(request: RequestLike, user: AuthUser | null | undefined): string | null {
  if (!requiresActionFrom(request, user)) return null;
  return ACTION_LABELS[request.status] ?? null;
}

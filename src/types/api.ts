export type Role =
  | 'AGENT'
  | 'RESPONSABLE_HIERARCHIQUE'
  | 'SOUS_DIRECTEUR_SDAG'
  | 'AGENT_TRAITEMENT_SDAG'
  | 'DIRECTEUR_GENERAL'
  | 'ADMIN'
  | 'TEST_INTEGRAL';

export type EmployeeStatus = 'CIVIL_SERVANT' | 'LABOUR_CODE';

export type RequestType =
  | 'CONGE_ANNUEL'
  | 'CONGE_MALADIE'
  | 'CONGE_MATERNITE'
  | 'PERMISSION_EVENEMENT_FAMILIAL'
  | 'REPRISE_SERVICE'
  | 'ATTESTATION_PRESENCE';

export type PermissionSubType =
  | 'PATERNITE'
  | 'MARIAGE'
  | 'DECES_CONJOINT'
  | 'DECES_ASCENDANT'
  | 'DECES_DESCENDANT'
  | 'AUTRE';

export type RequestStatus =
  | 'DRAFT'
  | 'PENDING_MANAGER_REVIEW'
  | 'MANAGER_REJECTED'
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'RETURNED_TO_SDAG_DIRECTOR'
  | 'APPROVED'
  | 'REJECTED';

// Aggregate figures for the Directeur Général's dashboard: counts only, no
// personal detail. Drafts are excluded — they are not yet requests.
export type TargetStage = 'HIERARCHY' | 'ASSIGNMENT' | 'TREATMENT' | 'TOTAL';

export interface RequestsOverview {
  year: number;
  total: number;
  inCircuit: number;
  awaitingMyReview: number;
  newToday: number;
  stalled: { thresholdDays: number; count: number };
  byStatus: Partial<Record<RequestStatus, number>>;
  byType: Partial<Record<RequestType, number>>;
  monthly: { month: number; received: number; closed: number }[];
  // Moyennes en jours ; null quand aucun dossier n'a encore franchi l'étape.
  delays: {
    total: number | null;
    hierarchy: number | null;
    assignment: number | null;
    treatment: number | null;
    decidedCount: number;
  };
  agentLoad: { employeeId: string; name: string; count: number }[];
  opinions: { favourable: number; unfavourable: number };
  // Délais cibles saisis par l'administration. Une étape absente n'est pas
  // contrôlée.
  targets: Partial<Record<TargetStage, number>>;
  // null tant qu'aucune cible n'est saisie : zéro se lirait à tort comme
  // « aucun retard ».
  overdue: number | null;
  onTimeShare: number | null;
}

// Historique d'un agent tel que renvoyé par /requests/employee/:id/history.
// `totals` porte sur le périmètre filtré : les chiffres affichés et ceux de
// la fiche imprimée doivent coïncider.
export interface EmployeeHistory {
  employee: Employee & { grade?: string | null; position: string };
  filters: { year: number | null; type: RequestType | null };
  availableYears: number[];
  items: LeaveRequest[];
  totals: { type: RequestType; count: number; days: number; approvedDays: number }[];
}

export interface OrganizationUnit {
  id: string;
  name: string;
  code: string;
  type: string;
  parentId: string | null;
}

// Un maillon de la chaîne de validation d'un agent.
export interface EmployeeSupervisor {
  id: string;
  level: number;
  supervisorId: string;
}

export interface Employee {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  position: string;
  status: EmployeeStatus;
  organizationUnitId: string;
  managerId: string | null;
  organizationUnit?: OrganizationUnit;
  manager?: Employee | null;
  // Chaîne de validation, par niveau croissant. Absente des charges utiles
  // allégées (sélecteurs d'agents, par exemple).
  supervisors?: EmployeeSupervisor[];
}

export interface AuthUser {
  id: string;
  email: string;
  matricule?: string;
  role: Role;
  employeeId: string;
  employee?: Employee;
  // True when at least one employee reports to this user. Drives the
  // "Demandes à examiner" entry: reviewing is a hierarchy fact, not a role,
  // so a Chef de Service, a Sous-Directeur and the Directeur Général all
  // qualify. Absent on older tokens/profiles — treat undefined as false.
  hasSubordinates?: boolean;
}

export interface Attachment {
  id: string;
  requestId: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedById?: string;
  uploadedBy?: { role: Role };
}

export interface ManagerReview {
  id: string;
  decision: 'FAVORABLE' | 'DEFAVORABLE';
  comment: string | null;
  createdAt: string;
  actorId: string;
}

export interface SdagAssignment {
  id: string;
  assigneeId: string;
  assignedById: string;
  createdAt: string;
}

export interface SdagTreatment {
  id: string;
  observation: string | null;
  createdAt: string;
  actorId: string;
}

export interface SdagDecision {
  id: string;
  decision: 'APPROVED' | 'REJECTED';
  comment: string | null;
  createdAt: string;
  actorId: string;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  comment: string | null;
  createdAt: string;
  actorId: string | null;
}

export interface LeaveRequest {
  id: string;
  // Niveau de la chaîne dont l'avis est attendu, tant que la demande est en
  // attente d'avis hiérarchique.
  currentHierarchyLevel?: number | null;
  reference: string | null;
  type: RequestType;
  permissionSubType: PermissionSubType | null;
  employeeId: string;
  interimEmployeeId: string | null;
  startDate: string;
  endDate: string;
  motif: string | null;
  calculatedDays: number | null;
  imputedAnnualLeaveDays: number | null;
  repriseNoteNumber: string | null;
  repriseNoteDate: string | null;
  reprisePriorType: string | null;
  reprisePriorStartDate: string | null;
  reprisePriorEndDate: string | null;
  status: RequestStatus;
  currentAssigneeId: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee: Employee;
  interimEmployee?: Employee | null;
  currentAssignee?: Employee | null;
  attachments: Attachment[];
  managerReviews: ManagerReview[];
  sdagAssignments: SdagAssignment[];
  sdagTreatments: SdagTreatment[];
  sdagDecisions: SdagDecision[];
  statusHistory: StatusHistoryEntry[];
  durationWarnings?: string[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QuotaSummary {
  year: number;
  congeAnnuel: {
    year: number;
    entitlementDays: number;
    usedDays: number;
    pendingDays: number;
    availableDays: number;
  };
  congeMaladie: { usedDaysThisYear: number };
  permissionsMotivees: { usedDaysThisYear: number };
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  requestId: string | null;
  request?: { reference: string | null } | null;
  readAt: string | null;
  createdAt: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface AdminEmployee extends Employee {
  user?: { id: string } | null;
}

export interface AdminUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  employeeId: string;
  employee: Employee;
}

export interface AnnualLeaveDecision {
  id: string;
  year: number;
  category: EmployeeStatus;
  number: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

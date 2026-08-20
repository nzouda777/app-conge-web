export type Role =
  | 'AGENT'
  | 'RESPONSABLE_HIERARCHIQUE'
  | 'SOUS_DIRECTEUR_SDAG'
  | 'AGENT_TRAITEMENT_SDAG'
  | 'ADMIN';

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

export interface OrganizationUnit {
  id: string;
  name: string;
  code: string;
  type: string;
  parentId: string | null;
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
}

export interface AuthUser {
  id: string;
  email: string;
  matricule?: string;
  role: Role;
  employeeId: string;
  employee?: Employee;
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

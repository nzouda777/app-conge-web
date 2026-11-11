import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import KeyIcon from '@mui/icons-material/VpnKey';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  createAdminUser,
  deactivateAdminUser,
  deleteAdminUser,
  reissueProvisionalPasswords,
  listAdminEmployees,
  listAdminUsers,
  reactivateAdminUser,
  resetAdminUserPassword,
  updateAdminUser,
  type CreateUserInput,
  type UpdateUserInput,
} from '../../api/admin';
import { listOrganizationUnits } from '../../api/organization';
import { getApiErrorMessage } from '../../api/client';
import { ROLE_LABELS } from '../../types/labels';
import { StepUpDialog } from '../../components/StepUpDialog';
import { CredentialsSheet } from '../../components/CredentialsSheet';
import { tokens } from '../../theme/tokens';
import type { AdminUser, ProvisionalCredential, Role } from '../../types/api';
import type { AdminUserSortField } from '../../api/admin';
import { PersonnelImportDialog } from './PersonnelImportDialog';

const ROLES: Role[] = [
  'AGENT',
  'RESPONSABLE_HIERARCHIQUE',
  'SOUS_DIRECTEUR_SDAG',
  'AGENT_TRAITEMENT_SDAG',
  'DIRECTEUR_GENERAL',
  'ADMIN',
];

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  // Plus de 1500 comptes : la liste est paginée et triable côté serveur.
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [statusFilter, setStatusFilter] = useState<'' | 'CIVIL_SERVANT' | 'LABOUR_CODE'>('');
  const [sortBy, setSortBy] = useState<AdminUserSortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: users, isLoading, error: listError } = useQuery({
    queryKey: ['admin', 'users', search, roleFilter, statusFilter, sortBy, sortDir, page, pageSize],
    queryFn: () =>
      listAdminUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        sortBy,
        sortDir,
        page: page + 1,
        pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  // Un changement de filtre ou de tri ramène à la première page : rester sur
  // la page 7 d'un résultat qui n'en compte plus que 2 afficherait du vide.
  function applySort(field: AdminUserSortField) {
    if (field === sortBy) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
  }

  // Confirmation visible de ce qui vient d'être fait : seul le changement de
  // puce sur la ligne le signalait, ce qui passe inaperçu sur une liste longue.
  const [notice, setNotice] = useState<string | null>(null);

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateAdminUser(id),
    onSuccess: (u) => {
      invalidate();
      setNotice(`Compte de ${u.employee.firstName} ${u.employee.lastName} désactivé. Ses sessions ouvertes cessent immédiatement d'être valides.`);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de désactiver ce compte.')),
  });
  const reactivateMutation = useMutation({
    mutationFn: (id: string) => reactivateAdminUser(id),
    onSuccess: (u) => {
      invalidate();
      setNotice(`Compte de ${u.employee.firstName} ${u.employee.lastName} réactivé.`);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de réactiver ce compte.')),
  });

  // Réémission groupée des mots de passe provisoires, pour les comptes jamais
  // activés. L'interface promettait cette voie de récupération — « si la liste
  // est perdue, il faudra réémettre les mots de passe des comptes jamais
  // activés » — sans l'offrir nulle part : le point d'entrée existait côté API
  // et côté client, mais aucun écran ne l'appelait.
  const [reissueOpen, setReissueOpen] = useState(false);
  const reissueMutation = useMutation({
    mutationFn: (password: string) => reissueProvisionalPasswords(password),
    onSuccess: (res) => {
      setReissueOpen(false);
      setStepUpError(null);
      invalidate();
      if (res.credentials.length > 0) {
        setCredentials(res.credentials);
        setCredentialsPdf(res.credentialsPdf);
      }
      else setNotice("Aucun compte jamais activé : rien à réémettre.");
    },
    onError: (e) => setStepUpError(getApiErrorMessage(e, 'Impossible de réémettre les mots de passe.')),
  });
  // Supprimer un compte exige désormais le mot de passe de l'administrateur,
  // redemandé au moment de l'acte.
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  // Mots de passe provisoires à remettre, affichés une seule fois.
  const [credentials, setCredentials] = useState<ProvisionalCredential[] | null>(null);
  // Document de distribution produit par le serveur, reçu dans la même
  // réponse que les identifiants.
  const [credentialsPdf, setCredentialsPdf] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => deleteAdminUser(id, password),
    onSuccess: () => {
      invalidate();
      setDeleteUser(null);
      setStepUpError(null);
    },
    onError: (e) => setStepUpError(getApiErrorMessage(e, 'Impossible de supprimer ce compte.')),
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, color: tokens.brand }}>
            Utilisateurs
          </Typography>
          <Typography sx={{ color: tokens.inkSecondary }}>
            Créer, modifier, désactiver ou supprimer des comptes de connexion. Les mots de passe
            sont générés par le système et remis en main propre : l'administration ne les choisit
            pas et ne les connaît qu'une fois.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button startIcon={<KeyIcon />} onClick={() => setReissueOpen(true)}>
            Réémettre les mots de passe
          </Button>
          <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setCreateOpen(true)}>
            Créer un utilisateur
          </Button>
        </Stack>
      </Box>

      {notice && (
        <Alert severity="success" role="status" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      {listError && (
        <Alert severity="error" role="alert" sx={{ mb: 2 }}>
          {getApiErrorMessage(listError, 'Impossible de charger les utilisateurs.')}
        </Alert>
      )}
      {error && (
        <Alert severity="error" role="alert" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
          <TextField
            size="small"
            label="Rechercher (nom, matricule, email)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={{ flex: 1, minWidth: 260 }}
          />
          <TextField
            select
            size="small"
            label="Rôle"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as Role | '');
              setPage(0);
            }}
            sx={{ minWidth: 210 }}
          >
            <MenuItem value="">Tous</MenuItem>
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Statut"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as '' | 'CIVIL_SERVANT' | 'LABOUR_CODE');
              setPage(0);
            }}
            sx={{ minWidth: 190 }}
          >
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="CIVIL_SERVANT">Fonctionnaire</MenuItem>
            <MenuItem value="LABOUR_CODE">Code du travail</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => setImportOpen(true)}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Charger un fichier personnel
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sortDirection={sortBy === 'name' ? sortDir : false}>
                <TableSortLabel
                  active={sortBy === 'name'}
                  direction={sortBy === 'name' ? sortDir : 'asc'}
                  onClick={() => applySort('name')}
                >
                  Agent
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'matricule' ? sortDir : false}>
                <TableSortLabel
                  active={sortBy === 'matricule'}
                  direction={sortBy === 'matricule' ? sortDir : 'asc'}
                  onClick={() => applySort('matricule')}
                >
                  Matricule
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'unit' ? sortDir : false}>
                <TableSortLabel
                  active={sortBy === 'unit'}
                  direction={sortBy === 'unit' ? sortDir : 'asc'}
                  onClick={() => applySort('unit')}
                >
                  Service
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'role' ? sortDir : false}>
                <TableSortLabel
                  active={sortBy === 'role'}
                  direction={sortBy === 'role' ? sortDir : 'asc'}
                  onClick={() => applySort('role')}
                >
                  Rôle
                </TableSortLabel>
              </TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6}>Chargement…</TableCell>
              </TableRow>
            )}
            {users?.items.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>
                  <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                    {u.employee.firstName} {u.employee.lastName}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: tokens.inkSecondary }}>{u.email}</Typography>
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{u.employee.matricule}</TableCell>
                <TableCell sx={{ fontSize: 13 }}>{u.employee.organizationUnit?.name ?? '-'}</TableCell>
                <TableCell sx={{ fontSize: 13 }}>{ROLE_LABELS[u.role]}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={u.isActive ? 'Actif' : 'Désactivé'}
                    color={u.isActive ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Modifier">
                    <IconButton size="small" onClick={() => setEditUser(u)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Réinitialiser le mot de passe">
                    <IconButton size="small" onClick={() => setResetPasswordUser(u)}>
                      <KeyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {u.isActive ? (
                    <Tooltip title="Désactiver">
                      <IconButton size="small" onClick={() => deactivateMutation.mutate(u.id)}>
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Réactiver">
                      <IconButton size="small" onClick={() => reactivateMutation.mutate(u.id)}>
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Supprimer le compte">
                    <IconButton size="small" color="error" onClick={() => setDeleteUser(u)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {users?.items.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} sx={{ color: tokens.inkSecondary, fontSize: 14 }}>
                  Aucun utilisateur.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={users?.total ?? 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100, 200]}
          labelRowsPerPage="Lignes par page"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        />
      </TableContainer>

      <PersonnelImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={invalidate}
      />

      {createOpen && (
        <CreateUserDialog
          onClose={() => setCreateOpen(false)}
          // Le mot de passe provisoire remonte ici et DOIT être affiché : le
          // serveur ne le conserve pas en clair. L'argument était ignoré, de
          // sorte qu'un compte créé était immédiatement inutilisable — personne
          // ne pouvait s'y connecter, et rien ne le signalait.
          onCreated={(credential, pdf) => {
            setCreateOpen(false);
            invalidate();
            setCredentials([credential]);
            setCredentialsPdf(pdf);
          }}
        />
      )}

      {editUser && (
        <EditUserDialog user={editUser} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); invalidate(); }} />
      )}

      {resetPasswordUser && (
        <ResetPasswordDialog
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onIssued={(credential, pdf) => {
            setResetPasswordUser(null);
            setCredentials([credential]);
            setCredentialsPdf(pdf);
          }}
        />
      )}

      <StepUpDialog
        open={!!deleteUser}
        title="Supprimer ce compte ?"
        description={
          deleteUser
            ? `Le compte de ${deleteUser.employee.firstName} ${deleteUser.employee.lastName} (${deleteUser.email}) sera supprimé. La fiche de l'agent et l'historique de ses demandes sont conservés : seul l'accès à l'application est retiré.`
            : ''
        }
        consequence="Sans retour possible. Préférez la désactivation si l'agent est susceptible de revenir — elle se défait, et préserve mieux la lisibilité de l'historique."
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        error={stepUpError}
        onCancel={() => {
          setDeleteUser(null);
          setStepUpError(null);
        }}
        onConfirm={(password) => deleteUser && deleteMutation.mutate({ id: deleteUser.id, password })}
      />

      {/* Mots de passe provisoires, affichés UNE SEULE FOIS : le serveur ne les
          conserve pas en clair. */}
      <StepUpDialog
        open={reissueOpen}
        title="Réémettre les mots de passe provisoires ?"
        description="Tous les comptes qui ne se sont JAMAIS connectés recevront un nouveau mot de passe provisoire, affiché une seule fois pour impression et remise. Les comptes déjà utilisés ne sont pas touchés."
        consequence="À n'utiliser que si la liste initiale a été perdue. Les agents concernés ne pourront pas se connecter avec l'ancienne valeur."
        confirmLabel="Réémettre"
        loading={reissueMutation.isPending}
        error={stepUpError}
        onCancel={() => {
          setReissueOpen(false);
          setStepUpError(null);
        }}
        onConfirm={(password) => reissueMutation.mutate(password)}
      />

      <CredentialsSheet
        open={!!credentials}
        credentials={credentials ?? []}
        pdfBase64={credentialsPdf}
        onClose={() => {
          setCredentials(null);
          setCredentialsPdf(null);
        }}
      />
    </Box>
  );
}

function CreateUserDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (credential: ProvisionalCredential, pdfBase64: string) => void;
}) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [employeeId, setEmployeeId] = useState('');
  const [matricule, setMatricule] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState<'CIVIL_SERVANT' | 'LABOUR_CODE'>('CIVIL_SERVANT');
  const [organizationUnitId, setOrganizationUnitId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('AGENT');
  const [error, setError] = useState<string | null>(null);
  // Ré-authentification : créer un compte attribue des droits dans le circuit.
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Agents sans compte, pour le sélecteur. La liste est désormais paginée
  // côté serveur : on demande explicitement ceux qui n'ont pas encore de
  // compte, plutôt que de rapatrier les 1 500 fiches pour les filtrer ici.
  const { data: employees } = useQuery({
    queryKey: ['admin', 'employees', 'without-user'],
    queryFn: () => listAdminEmployees({ withoutUser: true, pageSize: 200 }),
  });
  const { data: orgUnits } = useQuery({ queryKey: ['organization-units'], queryFn: listOrganizationUnits });
  const availableEmployees = employees?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (input: CreateUserInput) => createAdminUser(input),
    // Le mot de passe provisoire n'est renvoyé qu'ici : il remonte à la page,
    // qui l'affiche dans la feuille de remise.
    onSuccess: (res) => onCreated(res.credential, res.credentialsPdf),
    onError: (e) => setError(getApiErrorMessage(e, "Impossible de créer l'utilisateur.")),
  });

  function submit(confirmPassword: string) {
    setError(null);
    const base = { email, role, confirmPassword };
    const input: CreateUserInput =
      mode === 'existing'
        ? { ...base, employeeId }
        : { ...base, matricule, firstName, lastName, position, status, organizationUnitId };
    createMutation.mutate(input);
  }

  // Le mot de passe du compte créé n'est plus saisi ici : il est tiré au sort
  // par le serveur et remis à l'intéressé.
  const canSubmit =
    mode === 'existing'
      ? !!employeeId && !!email
      : !!matricule && !!firstName && !!lastName && !!position && !!organizationUnitId && !!email;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Créer un utilisateur</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error" role="alert">{error}</Alert>}
          <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => v && setMode(v)} size="small">
            <ToggleButton value="existing">Employé existant</ToggleButton>
            <ToggleButton value="new">Nouvel employé</ToggleButton>
          </ToggleButtonGroup>

          {mode === 'existing' ? (
            <Autocomplete
              options={availableEmployees}
              getOptionLabel={(e) => `${e.firstName} ${e.lastName} - ${e.matricule}`}
              onChange={(_, value) => setEmployeeId(value?.id ?? '')}
              renderInput={(params) => <TextField {...params} label="Employé (sans compte)" required />}
            />
          ) : (
            <>
              <TextField label="Matricule" required value={matricule} onChange={(e) => setMatricule(e.target.value)} />
              <Stack direction="row" spacing={2}>
                <TextField label="Prénom" required fullWidth value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <TextField label="Nom" required fullWidth value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </Stack>
              <TextField label="Poste" required value={position} onChange={(e) => setPosition(e.target.value)} />
              <TextField select label="Statut" required value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <MenuItem value="CIVIL_SERVANT">Fonctionnaire</MenuItem>
                <MenuItem value="LABOUR_CODE">Code du travail (contractuel)</MenuItem>
              </TextField>
              <TextField
                select
                label="Service"
                required
                value={organizationUnitId}
                onChange={(e) => setOrganizationUnitId(e.target.value)}
              >
                {orgUnits?.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}

          <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField select label="Rôle" required value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </MenuItem>
            ))}
          </TextField>
          <Alert severity="info" sx={{ fontSize: 14 }}>
            Le mot de passe est généré par le système et affiché une seule fois à l'écran suivant,
            pour remise en main propre. Vous ne le choisissez pas : un administrateur capable de
            fixer le mot de passe d'un agent peut agir sous son identité, et le dossier porterait
            alors la signature de l'agent.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="contained"
          disabled={!canSubmit || createMutation.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          Créer
        </Button>
      </DialogActions>

      <StepUpDialog
        open={confirmOpen}
        title="Créer ce compte ?"
        description={`Un compte ${ROLE_LABELS[role]} sera ouvert pour ${email}, avec un mot de passe provisoire à remettre à l'intéressé.`}
        confirmLabel="Créer le compte"
        loading={createMutation.isPending}
        error={error}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={submit}
      />
    </Dialog>
  );
}

function EditUserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [firstName, setFirstName] = useState(user.employee.firstName);
  const [lastName, setLastName] = useState(user.employee.lastName);
  const [position, setPosition] = useState(user.employee.position);
  const [status, setStatus] = useState(user.employee.status);
  const [organizationUnitId, setOrganizationUnitId] = useState(user.employee.organizationUnitId);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: orgUnits } = useQuery({ queryKey: ['organization-units'], queryFn: listOrganizationUnits });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateUserInput) => updateAdminUser(user.id, input),
    onSuccess: onSaved,
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de mettre à jour cet utilisateur.')),
  });

  const roleChanged = role !== user.role;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Modifier - {user.employee.firstName} {user.employee.lastName}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error" role="alert">{error}</Alert>}
          <Stack direction="row" spacing={2}>
            <TextField label="Prénom" fullWidth value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <TextField label="Nom" fullWidth value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Stack>
          <TextField label="Poste" value={position} onChange={(e) => setPosition(e.target.value)} />
          <TextField select label="Statut" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <MenuItem value="CIVIL_SERVANT">Fonctionnaire</MenuItem>
            <MenuItem value="LABOUR_CODE">Code du travail (contractuel)</MenuItem>
          </TextField>
          <TextField
            select
            label="Service"
            value={organizationUnitId}
            onChange={(e) => setOrganizationUnitId(e.target.value)}
          >
            {orgUnits?.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField select label="Rôle" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" disabled={updateMutation.isPending} onClick={() => setConfirmOpen(true)}>
          Enregistrer
        </Button>
      </DialogActions>

      <StepUpDialog
        open={confirmOpen}
        title="Enregistrer les modifications ?"
        description={`La fiche de ${user.employee.firstName} ${user.employee.lastName} sera mise à jour.`}
        consequence={
          roleChanged
            ? `Le rôle passe de « ${ROLE_LABELS[user.role]} » à « ${ROLE_LABELS[role]} ». Cela redistribue des droits dans le circuit de validation, et sera consigné au journal d'audit sous une entrée distincte.`
            : undefined
        }
        confirmLabel="Enregistrer"
        loading={updateMutation.isPending}
        error={error}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={(confirmPassword) =>
          updateMutation.mutate({
            confirmPassword,
            email,
            role,
            employee: { firstName, lastName, position, status, organizationUnitId },
          })
        }
      />
    </Dialog>
  );
}

function ResetPasswordDialog({
  user,
  onClose,
  onIssued,
}: {
  user: AdminUser;
  onClose: () => void;
  onIssued: (credential: ProvisionalCredential, pdfBase64: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  // L'administrateur ne CHOISIT plus le mot de passe : le serveur en tire un au
  // sort et le renvoie une seule fois, pour remise à l'intéressé.
  //
  // Auparavant l'administrateur le saisissait, et le connaissait donc : il
  // pouvait se connecter au compte et agir sous l'identité de son titulaire —
  // rendre un avis hiérarchique, valider un congé — le dossier portant la
  // signature de la victime. La réinitialisation était journalisée, mais pas ce
  // qui s'ensuivait.
  const mutation = useMutation({
    mutationFn: (password: string) => resetAdminUserPassword(user.id, password),
    onSuccess: (res) => onIssued(res.credential, res.credentialsPdf),
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de réinitialiser le mot de passe.')),
  });

  return (
    <StepUpDialog
      open
      title={`Réinitialiser le mot de passe de ${user.employee.firstName} ${user.employee.lastName} ?`}
      description="Un mot de passe provisoire sera tiré au sort et affiché une seule fois, pour remise en main propre. L'agent devra en changer dès sa première connexion."
      consequence="Toutes les sessions ouvertes de ce compte seront immédiatement fermées. Si l'agent est en train de travailler, il sera déconnecté."
      confirmLabel="Réinitialiser"
      loading={mutation.isPending}
      error={error}
      onCancel={onClose}
      onConfirm={(password) => {
        setError(null);
        mutation.mutate(password);
      }}
    />
  );
}

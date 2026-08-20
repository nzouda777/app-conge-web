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
  TableRow,
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
import {
  createAdminUser,
  deactivateAdminUser,
  deleteAdminUser,
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
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { AdminUser, Role } from '../../types/api';

const ROLES: Role[] = ['AGENT', 'RESPONSABLE_HIERARCHIQUE', 'SOUS_DIRECTEUR_SDAG', 'AGENT_TRAITEMENT_SDAG', 'ADMIN'];

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: users, isLoading, error: listError } = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => listAdminUsers({ search: search || undefined }),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
  }

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateAdminUser(id),
    onSuccess: invalidate,
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de désactiver ce compte.')),
  });
  const reactivateMutation = useMutation({
    mutationFn: (id: string) => reactivateAdminUser(id),
    onSuccess: invalidate,
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de réactiver ce compte.')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: () => {
      invalidate();
      setDeleteUser(null);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de supprimer ce compte.')),
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72' }}>Utilisateurs</Typography>
          <Typography sx={{ fontSize: 13, color: '#5D6D7E' }}>
            Créer, modifier, désactiver ou supprimer des comptes de connexion.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setCreateOpen(true)}>
          Créer un utilisateur
        </Button>
      </Box>

      {listError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorMessage(listError, 'Impossible de charger les utilisateurs.')}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <TextField
          size="small"
          label="Rechercher (nom, matricule, email)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 340 }}
        />
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Agent</TableCell>
              <TableCell>Matricule</TableCell>
              <TableCell>Service</TableCell>
              <TableCell>Rôle</TableCell>
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
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                    {u.employee.firstName} {u.employee.lastName}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>{u.email}</Typography>
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{u.employee.matricule}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{u.employee.organizationUnit?.name ?? '—'}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{ROLE_LABELS[u.role]}</TableCell>
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
                <TableCell colSpan={6} sx={{ color: '#5D6D7E', fontSize: 13 }}>
                  Aucun utilisateur.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {createOpen && (
        <CreateUserDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            invalidate();
          }}
        />
      )}

      {editUser && (
        <EditUserDialog user={editUser} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); invalidate(); }} />
      )}

      {resetPasswordUser && (
        <ResetPasswordDialog user={resetPasswordUser} onClose={() => setResetPasswordUser(null)} />
      )}

      <ConfirmDialog
        open={!!deleteUser}
        title="Supprimer ce compte ?"
        description={
          deleteUser
            ? `Le compte de ${deleteUser.employee.firstName} ${deleteUser.employee.lastName} (${deleteUser.email}) sera définitivement supprimé. La fiche employé et l'historique de ses demandes sont conservés — seul l'accès à l'application est retiré. Cette action est irréversible.`
            : ''
        }
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteUser(null)}
        onConfirm={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
      />
    </Box>
  );
}

function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
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
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: employees } = useQuery({ queryKey: ['admin', 'employees'], queryFn: listAdminEmployees });
  const { data: orgUnits } = useQuery({ queryKey: ['organization-units'], queryFn: listOrganizationUnits });
  const availableEmployees = (employees ?? []).filter((e) => !e.user);

  const createMutation = useMutation({
    mutationFn: (input: CreateUserInput) => createAdminUser(input),
    onSuccess: onCreated,
    onError: (e) => setError(getApiErrorMessage(e, "Impossible de créer l'utilisateur.")),
  });

  function submit() {
    setError(null);
    const input: CreateUserInput =
      mode === 'existing'
        ? { employeeId, email, role, password }
        : { matricule, firstName, lastName, position, status, organizationUnitId, email, role, password };
    createMutation.mutate(input);
  }

  const canSubmit =
    mode === 'existing'
      ? !!employeeId && !!email && !!password
      : !!matricule && !!firstName && !!lastName && !!position && !!organizationUnitId && !!email && !!password;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Créer un utilisateur</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => v && setMode(v)} size="small">
            <ToggleButton value="existing">Employé existant</ToggleButton>
            <ToggleButton value="new">Nouvel employé</ToggleButton>
          </ToggleButtonGroup>

          {mode === 'existing' ? (
            <Autocomplete
              options={availableEmployees}
              getOptionLabel={(e) => `${e.firstName} ${e.lastName} — ${e.matricule}`}
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
          <TextField
            label="Mot de passe"
            type="text"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="Communiquez-le à l'agent — il pourra le changer plus tard."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" disabled={!canSubmit || createMutation.isPending} onClick={submit}>
          Créer
        </Button>
      </DialogActions>
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

  const { data: orgUnits } = useQuery({ queryKey: ['organization-units'], queryFn: listOrganizationUnits });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateUserInput) => updateAdminUser(user.id, input),
    onSuccess: onSaved,
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de mettre à jour cet utilisateur.')),
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Modifier — {user.employee.firstName} {user.employee.lastName}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
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
        <Button
          variant="contained"
          disabled={updateMutation.isPending}
          onClick={() =>
            updateMutation.mutate({
              email,
              role,
              employee: { firstName, lastName, position, status, organizationUnitId },
            })
          }
        >
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => resetAdminUserPassword(user.id, newPassword),
    onSuccess: () => setDone(true),
    onError: (e) => setError(getApiErrorMessage(e, 'Impossible de réinitialiser le mot de passe.')),
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        Réinitialiser le mot de passe — {user.employee.firstName} {user.employee.lastName}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {done ? (
            <Alert severity="success">Mot de passe réinitialisé.</Alert>
          ) : (
            <TextField
              autoFocus
              label="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{done ? 'Fermer' : 'Annuler'}</Button>
        {!done && (
          <Button
            variant="contained"
            disabled={newPassword.length < 4 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Réinitialiser
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

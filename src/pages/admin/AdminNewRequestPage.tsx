import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Autocomplete, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { fetchEmployeeQuota, listAdminEmployees } from '../../api/admin';
import { getApiErrorMessage } from '../../api/client';
import { NewRequestPage } from '../NewRequestPage';
import { tokens } from '../../theme/tokens';
import type { AdminEmployee, LeaveRequest } from '../../types/api';

// Saisie d'une demande pour le compte d'un agent : celui qui n'a pas encore
// de compte, n'a pas accès à un poste, ou a remis sa demande sur papier.
//
// Deux temps : choisir l'agent, puis remplir le formulaire ordinaire — le
// même que celui du personnel, pour que les règles (justificatif, solde,
// motif) ne divergent jamais. Une fois soumise, la demande suit le circuit
// hiérarchique habituel ; l'agent est notifié qu'elle a été déposée à son nom.
export function AdminNewRequestPage() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [employee, setEmployee] = useState<AdminEmployee | null>(null);
  const [submitted, setSubmitted] = useState<{ request: LeaveRequest; employee: AdminEmployee } | null>(null);

  // La recherche part à la frappe, avec un court délai : une requête par
  // caractère saisi ne servirait à rien.
  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isFetching, error } = useQuery({
    queryKey: ['admin', 'employees', 'on-behalf-picker', search],
    queryFn: () => listAdminEmployees({ search: search || undefined, pageSize: 20 }),
  });

  if (submitted) {
    const { request, employee: e } = submitted;
    return (
      <Box sx={{ maxWidth: 760 }}>
        <Alert severity="success" role="status" sx={{ mb: 2 }}>
          Demande {request.reference ? <strong>{request.reference}</strong> : null} déposée pour {e.firstName}{' '}
          {e.lastName} ({e.matricule}). Elle suit désormais son parcours hiérarchique, et l'agent en a été notifié.
        </Alert>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            onClick={() => {
              setSubmitted(null);
              setEmployee(null);
              setInput('');
            }}
          >
            Saisir une autre demande
          </Button>
          <Button component={RouterLink} to="/demandes">
            Voir la liste des demandes
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, maxWidth: 760 }}>
        <Typography component="h1" sx={{ fontSize: 18, fontWeight: 600, color: tokens.brand, mb: 0.5 }}>
          Saisir une demande pour un agent
        </Typography>
        <Typography sx={{ fontSize: 14, color: tokens.inkSecondary, mb: 2 }}>
          La demande sera établie au nom de l'agent choisi et transmise à son supérieur hiérarchique. La saisie est
          journalisée sous votre identité.
        </Typography>
        {error && (
          <Alert severity="error" role="alert" sx={{ mb: 2 }}>
            {getApiErrorMessage(error, 'Impossible de charger la liste des agents.')}
          </Alert>
        )}
        <Autocomplete
          options={data?.items ?? []}
          value={employee}
          onChange={(_, value) => setEmployee(value)}
          inputValue={input}
          onInputChange={(_, value, reason) => {
            // La sélection remplit le champ avec le libellé de l'agent : ne pas
            // relancer de recherche sur ce texte-là.
            if (reason === 'input' || reason === 'clear') setInput(value);
          }}
          // Le filtrage est fait par l'API (nom, prénom, matricule).
          filterOptions={(x) => x}
          loading={isFetching}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          getOptionLabel={(e) => `${e.lastName} ${e.firstName} (${e.matricule})`}
          renderOption={(props, e) => (
            <li {...props} key={e.id}>
              <Box>
                <Typography sx={{ fontSize: 14 }}>
                  {e.lastName} {e.firstName} <span style={{ color: tokens.inkSecondary }}>· {e.matricule}</span>
                </Typography>
                <Typography sx={{ fontSize: 12, color: tokens.inkSecondary }}>
                  {e.position} — {e.organizationUnit?.name}
                </Typography>
              </Box>
            </li>
          )}
          noOptionsText={search ? 'Aucun agent ne correspond.' : 'Tapez un nom ou un matricule.'}
          renderInput={(params) => (
            <TextField {...params} label="Agent concerné" placeholder="Nom, prénom ou matricule" required />
          )}
        />
      </Paper>

      {employee && (
        // `key` : changer d'agent repart d'un formulaire vierge, sans brouillon
        // créé pour l'agent précédent.
        <NewRequestPage
          key={employee.id}
          onBehalfOf={{
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            matricule: employee.matricule,
            manager: employee.manager,
            fetchQuota: () => fetchEmployeeQuota(employee.id),
          }}
          onSubmitted={(request) => setSubmitted({ request, employee })}
        />
      )}
    </Box>
  );
}

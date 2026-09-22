import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { importPersonnelFile, type PersonnelImportReport } from '../../api/admin';
import { getApiErrorMessage } from '../../api/client';

function Line({ label, value }: { label: string; value: number | string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography sx={{ fontSize: 12.5, color: '#5D6D7E' }}>{label}</Typography>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#1B4F72' }}>{value}</Typography>
    </Box>
  );
}

// Chargement d'un nouveau fichier personnel. L'import rapproche le fichier de
// la base : il crée ce qui manque, met à jour ce qui a changé (nomination,
// structure, statut) et ne supprime rien - un agent absent du nouveau fichier
// garde son compte, ses demandes y étant rattachées.
export function PersonnelImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [report, setReport] = useState<PersonnelImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setProgress(null);
    setReport(null);
    setError(null);
  }

  const mutation = useMutation({
    mutationFn: () => importPersonnelFile(file!, setProgress),
    onSuccess: (r) => {
      setReport(r);
      setProgress(null);
      setError(null);
      onImported();
    },
    onError: (e) => {
      setProgress(null);
      setError(getApiErrorMessage(e, "L'import a échoué."));
    },
  });

  const anomalies = report
    ? report.skipped.length +
      report.unresolvedSupervisors.length +
      report.withoutHierarchy.length +
      report.codeCollisions.length
    : 0;

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ fontSize: 16, color: '#1B4F72' }}>Charger un fichier personnel</DialogTitle>
      <DialogContent>
        {!report && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography sx={{ fontSize: 12.5, color: '#5D6D7E' }}>
              Classeur Excel (.xlsx) comportant les colonnes MATRICULE, NOM_PRENOM, GRADE, POSTE, STRUCTURE,
              STRUCTURE GENERALE, HIERACHIE_1 à 4, TELEPHONE, DATE_ARRIVEE_DGB et STATUT.
            </Typography>
            <Alert severity="info">
              L'import met à jour l'existant et crée ce qui manque. Il ne supprime aucun compte : un agent
              absent du nouveau fichier conserve le sien, ses demandes y étant rattachées.
            </Alert>
            <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} sx={{ alignSelf: 'flex-start' }}>
              {file ? 'Changer de fichier' : 'Choisir le fichier'}
              <input
                type="file"
                hidden
                accept=".xlsx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                  e.target.value = '';
                }}
              />
            </Button>
            {file && (
              <Typography sx={{ fontSize: 13 }}>
                {file.name} ({Math.round(file.size / 1024)} Ko)
              </Typography>
            )}
            {progress !== null && (
              <Box>
                <LinearProgress variant="determinate" value={progress} />
                <Typography sx={{ fontSize: 11, color: '#5D6D7E', mt: 0.5 }}>
                  {progress < 100 ? `Envoi… ${progress}%` : 'Import en cours…'}
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {report && (
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Alert severity={anomalies > 0 ? 'warning' : 'success'}>
              Import terminé sur la feuille « {report.sheet} ».
              {anomalies > 0 ? ` ${anomalies} point(s) à vérifier ci-dessous.` : ' Aucune anomalie.'}
            </Alert>
            <Line label="Lignes lues" value={report.totalRows} />
            <Line label="Agents créés" value={report.createdEmployees} />
            <Line label="Agents mis à jour" value={report.updatedEmployees} />
            <Line label="Comptes créés" value={report.createdUsers} />
            <Line label="Rôles modifiés" value={report.roleChanges.length} />
            <Line label="Structures" value={report.organizationUnits} />
            <Box sx={{ borderTop: '1px solid #f0f1f3', pt: 1, mt: 1 }} />
            <Line label="Lignes écartées" value={report.skipped.length} />
            <Line label="Supérieurs introuvables" value={report.unresolvedSupervisors.length} />
            <Line label="Agents sans hiérarchie" value={report.withoutHierarchy.length} />
            <Line label="Codes de structure en conflit" value={report.codeCollisions.length} />

            {report.skipped.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1B4F72', mb: 0.5 }}>
                  Lignes écartées
                </Typography>
                <Box sx={{ maxHeight: 180, overflowY: 'auto', bgcolor: '#FAFBFC', borderRadius: 1, p: 1 }}>
                  {report.skipped.map((sk) => (
                    <Typography key={`${sk.row}-${sk.matricule}`} sx={{ fontSize: 11.5, color: '#5D6D7E' }}>
                      Ligne {sk.row} · {sk.matricule || '(vide)'} · {sk.name} - {sk.reason}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            reset();
            onClose();
          }}
        >
          {report ? 'Fermer' : 'Annuler'}
        </Button>
        {!report && (
          <Button
            variant="contained"
            disabled={!file || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Import…' : 'Lancer l\'import'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

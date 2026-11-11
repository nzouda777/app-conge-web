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
import { CredentialsSheet } from '../../components/CredentialsSheet';
import { StepUpDialog } from '../../components/StepUpDialog';
import { tokens } from '../../theme/tokens';

function Line({ label, value }: { label: string; value: number | string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography sx={{ fontSize: 14, color: tokens.inkSecondary }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: tokens.brand }}>{value}</Typography>
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
  const [showCredentials, setShowCredentials] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);

  function reset() {
    setFile(null);
    setProgress(null);
    setReport(null);
    setError(null);
    setShowCredentials(false);
    setConfirmApply(false);
  }

  // Deux temps : on SIMULE d'abord, on applique ensuite.
  //
  // L'import appliquait les changements de rôle puis les signalait dans son
  // rapport — dans cet ordre. Une cellule mal saisie dans POSTE ou STRUCTURE
  // GENERALE promouvait ou rétrogradait silencieusement un Sous-Directeur, et
  // l'administrateur ne le découvrait qu'après coup.
  const mutation = useMutation({
    mutationFn: ({ dryRun, confirmPassword }: { dryRun: boolean; confirmPassword?: string }) =>
      importPersonnelFile(file!, { dryRun, confirmPassword }, setProgress),
    onSuccess: (r) => {
      setReport(r);
      setProgress(null);
      setError(null);
      if (!r.dryRun) {
        setConfirmApply(false);
        onImported();
        // Les mots de passe provisoires des comptes créés ne sont renvoyés
        // qu'ici : on ouvre tout de suite la feuille de remise.
        if (r.credentials.length > 0) setShowCredentials(true);
      }
    },
    onError: (e) => {
      setProgress(null);
      setError(getApiErrorMessage(e, "L'import a échoué."));
    },
  });

  const isSimulation = report?.dryRun === true;

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
      <DialogTitle sx={{ fontSize: 16, color: tokens.brand }}>Charger un fichier personnel</DialogTitle>
      <DialogContent>
        {!report && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error" role="alert">{error}</Alert>}
            <Typography sx={{ fontSize: 13, color: tokens.inkSecondary }}>
              Classeur Excel (.xlsx) comportant les colonnes MATRICULE, NOM_PRENOM, GRADE, POSTE, STRUCTURE,
              STRUCTURE GENERALE, HIERACHIE_1 à 4, TELEPHONE, DATE_ARRIVEE_DGB et STATUT.
            </Typography>
            <Alert severity="info">
              L'import met à jour l'existant et crée ce qui manque. Il ne supprime aucun compte : un
              agent absent du nouveau fichier conserve le sien, ses demandes y étant rattachées — il
              vous sera simplement signalé, pour que vous décidiez de le désactiver.
            </Alert>
            <Alert severity="warning">
              Commencez par <strong>simuler</strong> : le rapport vous montrera exactement ce que
              l'import ferait — comptes créés et surtout changements de rôle — sans rien écrire.
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
              <Typography sx={{ fontSize: 14 }}>
                {file.name} ({Math.round(file.size / 1024)} Ko)
              </Typography>
            )}
            {progress !== null && (
              <Box>
                <LinearProgress variant="determinate" value={progress} />
                <Typography sx={{ fontSize: 13, color: tokens.inkSecondary, mt: 0.5 }}>
                  {progress < 100 ? `Envoi… ${progress}%` : 'Import en cours…'}
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {report && (
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Alert severity={isSimulation ? 'info' : anomalies > 0 ? 'warning' : 'success'}>
              {isSimulation ? (
                <>
                  <strong>Simulation</strong> sur la feuille « {report.sheet} » — rien n'a été
                  écrit. Vérifiez les chiffres ci-dessous, en particulier les changements de rôle,
                  puis appliquez.
                </>
              ) : (
                <>
                  Import terminé sur la feuille « {report.sheet} ».
                  {anomalies > 0 ? ` ${anomalies} point(s) à vérifier ci-dessous.` : ' Aucune anomalie.'}
                </>
              )}
            </Alert>
            <Line label="Lignes lues" value={report.totalRows} />
            <Line label="Agents créés" value={report.createdEmployees} />
            <Line label="Agents mis à jour" value={report.updatedEmployees} />
            <Line label="Comptes créés" value={report.createdUsers} />
            <Line label="Rôles modifiés" value={report.roleChanges.length} />
            <Line label="Structures" value={report.organizationUnits} />
            <Box sx={{ borderTop: `1px solid ${tokens.borderSoft}`, pt: 1, mt: 1 }} />
            <Line label="Lignes écartées" value={report.skipped.length} />
            <Line label="Supérieurs introuvables" value={report.unresolvedSupervisors.length} />
            <Line label="Agents sans hiérarchie" value={report.withoutHierarchy.length} />
            <Line label="Codes de structure en conflit" value={report.codeCollisions.length} />
            <Line label="Structures non résolues (unité de repli)" value={report.fallbackUnitAssignments.length} />
            <Line label="Comptes actifs absents du fichier" value={report.accountsAbsentFromFile.length} />

            {report.roleChanges.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: tokens.warningText, mb: 0.5 }}>
                  {isSimulation ? 'Changements de rôle qui seraient appliqués' : 'Changements de rôle appliqués'}
                </Typography>
                <Box sx={{ maxHeight: 200, overflowY: 'auto', bgcolor: tokens.warningSoft, borderRadius: 1, p: 1 }}>
                  {report.roleChanges.map((rc) => (
                    <Typography key={rc.matricule} sx={{ fontSize: 14, color: tokens.ink }}>
                      {rc.name} ({rc.matricule}) : {rc.from} → <strong>{rc.to}</strong>
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}

            {report.accountsAbsentFromFile.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: tokens.brand, mb: 0.5 }}>
                  Comptes actifs absents du fichier
                </Typography>
                <Typography sx={{ fontSize: 14, color: tokens.inkSecondary, mb: 0.75 }}>
                  Probablement des départs ou des mutations. Rien n'a été désactivé : un fichier
                  partiel ferait sortir tout le reste de l'effectif. Désactivez-les compte par
                  compte depuis la liste des utilisateurs.
                </Typography>
                <Box sx={{ maxHeight: 180, overflowY: 'auto', bgcolor: tokens.surfaceSunk, borderRadius: 1, p: 1 }}>
                  {report.accountsAbsentFromFile.map((a) => (
                    <Typography key={a.matricule} sx={{ fontSize: 14, color: tokens.inkSecondary }}>
                      {a.name} ({a.matricule}) —{' '}
                      {a.lastLoginAt
                        ? `dernière connexion le ${new Date(a.lastLoginAt).toLocaleDateString('fr-FR')}`
                        : 'jamais connecté'}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}

            {report.skipped.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: tokens.brand, mb: 0.5 }}>
                  Lignes écartées
                </Typography>
                <Box sx={{ maxHeight: 180, overflowY: 'auto', bgcolor: tokens.surfaceSunk, borderRadius: 1, p: 1 }}>
                  {report.skipped.map((sk) => (
                    <Typography key={`${sk.row}-${sk.matricule}`} sx={{ fontSize: 14, color: tokens.inkSecondary }}>
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
          {report && !isSimulation ? 'Fermer' : 'Annuler'}
        </Button>
        {!report && (
          <Button
            variant="outlined"
            disabled={!file || mutation.isPending}
            onClick={() => mutation.mutate({ dryRun: true })}
          >
            {mutation.isPending ? 'Analyse…' : 'Simuler'}
          </Button>
        )}
        {isSimulation && (
          <>
            <Button onClick={() => setReport(null)}>Revenir</Button>
            <Button variant="contained" disabled={mutation.isPending} onClick={() => setConfirmApply(true)}>
              {mutation.isPending ? 'Import…' : "Appliquer l'import"}
            </Button>
          </>
        )}
        {report && !isSimulation && report.credentials.length > 0 && (
          <Button variant="contained" onClick={() => setShowCredentials(true)}>
            Revoir les mots de passe
          </Button>
        )}
      </DialogActions>

      {/* Mots de passe provisoires des comptes créés : affichés une seule
          fois, jamais stockés en clair côté serveur. */}
      <StepUpDialog
        open={confirmApply}
        title="Appliquer cet import ?"
        description={
          report
            ? `${report.createdEmployees} agent(s) créé(s), ${report.createdUsers} compte(s) ouvert(s), ` +
              `${report.roleChanges.length} changement(s) de rôle.`
            : ''
        }
        consequence="Un import redistribue des rôles dans tout le circuit de validation et ouvre des comptes. Les mots de passe provisoires ne seront affichés qu'une fois, juste après."
        confirmLabel="Appliquer"
        loading={mutation.isPending}
        error={error}
        onCancel={() => setConfirmApply(false)}
        onConfirm={(confirmPassword) => mutation.mutate({ dryRun: false, confirmPassword })}
      />

      <CredentialsSheet
        open={showCredentials}
        credentials={report?.credentials ?? []}
        pdfBase64={report?.credentialsPdf}
        onClose={() => setShowCredentials(false)}
        title={`Mots de passe provisoires — ${report?.credentials.length ?? 0} compte(s) créé(s)`}
      />
    </Dialog>
  );
}

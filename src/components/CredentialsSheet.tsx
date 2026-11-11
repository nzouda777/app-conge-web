import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import { tokens } from '../theme/tokens';
import type { ProvisionalCredential } from '../types/api';

// Liste des mots de passe provisoires, à remettre par la voie hiérarchique.
//
// C'est le mécanisme qui remplace le mot de passe unique écrit dans le code :
// chaque agent reçoit une valeur distincte, tirée au sort, que le serveur ne
// conserve jamais en clair. Elle n'existe QUE dans cette fenêtre — fermée, elle
// est perdue et il faut la réémettre.
//
// Le document de distribution est un PDF produit par le SERVEUR, dans la même
// réponse que les identifiants : il porte l'en-tête officiel des autres
// documents de l'application et classe les agents par direction, une direction
// par page. Le produire ici aurait obligé soit à renvoyer les mots de passe au
// serveur, soit à embarquer un générateur PDF dans le navigateur.
//
// L'impression directe qui se trouvait ici a été remplacée par ce
// téléchargement : elle ouvrait une fenêtre surgissante — souvent bloquée par
// le navigateur — et produisait un document sans en-tête ni classement.
export function CredentialsSheet({
  credentials,
  pdfBase64,
  open,
  onClose,
  title = 'Mots de passe provisoires',
}: {
  credentials: ProvisionalCredential[];
  /** Document de distribution produit par le serveur, encodé en base64. */
  pdfBase64?: string | null;
  open: boolean;
  onClose: () => void;
  title?: string;
}) {
  const [error, setError] = useState<string | null>(null);

  // Regroupement par direction, à l'image du document : l'administrateur voit
  // à l'écran ce qu'il va remettre.
  const byDirection = new Map<string, ProvisionalCredential[]>();
  for (const c of credentials) {
    const key = c.direction?.trim() || 'Direction non précisée';
    if (!byDirection.has(key)) byDirection.set(key, []);
    byDirection.get(key)!.push(c);
  }
  const directions = [...byDirection.keys()].sort((a, b) => a.localeCompare(b, 'fr'));

  function saveFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    // L'ancre doit être DANS le document pour que le clic déclenche
    // l'enregistrement sur Firefox et Safari, et l'URL ne peut être révoquée
    // qu'une fois le navigateur l'ayant lue.
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const stamp = new Date().toISOString().slice(0, 10);

  function downloadPdf() {
    if (!pdfBase64) {
      setError(
        "Le document n'a pas été produit par le serveur. Utilisez l'export CSV, qui contient les mêmes informations.",
      );
      return;
    }
    try {
      const binary = atob(pdfBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      saveFile(
        new Blob([bytes], { type: 'application/pdf' }),
        `mots-de-passe-provisoires-${stamp}.pdf`,
      );
      setError(null);
    } catch {
      setError("Le document n'a pas pu être enregistré. Utilisez l'export CSV.");
    }
  }

  function downloadCsv() {
    const header = 'Direction;Structure;Matricule;Nom;Poste;Mot de passe provisoire';
    const rows = directions.flatMap((d) =>
      byDirection
        .get(d)!
        .map((c) =>
          [d, c.organizationUnit, c.matricule, c.fullName, c.position, c.password]
            // Le point-virgule est le séparateur attendu par Excel en
            // français ; on le neutralise dans les valeurs pour ne pas
            // décaler les colonnes.
            .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(';'),
        ),
    );
    // BOM UTF-8 : sans lui, Excel affiche les accents de travers.
    const blob = new Blob([`﻿${header}\n${rows.join('\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    saveFile(blob, `mots-de-passe-provisoires-${stamp}.csv`);
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ color: tokens.brand }}>{title}</DialogTitle>
      <DialogContent>
        <Alert severity="warning" role="alert" sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
            Ces mots de passe ne seront plus affichés.
          </Typography>
          Le serveur ne les conserve pas en clair. Enregistrez le document maintenant, puis remettez
          chaque identifiant à son titulaire par la voie hiérarchique. Chaque agent devra en changer
          à sa première connexion. Si le document est perdu, il faudra réémettre les mots de passe
          des comptes jamais activés.
        </Alert>

        {error && (
          <Alert severity="error" role="alert" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography sx={{ color: tokens.inkSecondary, mb: 2 }}>
          {credentials.length} compte(s), répartis sur {directions.length} direction(s). Le document
          PDF porte l'en-tête de la Direction Générale du Budget et classe les agents par direction,
          une direction par page, pour une remise séparée.
        </Typography>

        {directions.map((direction) => (
          <Box key={direction} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Typography sx={{ fontWeight: 700, color: tokens.brand }}>{direction}</Typography>
              <Chip label={byDirection.get(direction)!.length} size="small" />
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Matricule</TableCell>
                  <TableCell>Nom</TableCell>
                  <TableCell>Poste</TableCell>
                  <TableCell>Mot de passe provisoire</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {byDirection
                  .get(direction)!
                  .slice()
                  .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'))
                  .map((c) => (
                    <TableRow key={c.matricule}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{c.matricule}</TableCell>
                      <TableCell>{c.fullName}</TableCell>
                      <TableCell>{c.position}</TableCell>
                      <TableCell
                        sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.5 }}
                      >
                        {c.password}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Box>
        ))}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button startIcon={<DownloadIcon />} onClick={downloadCsv}>
          Exporter en CSV
        </Button>
        <Button startIcon={<PictureAsPdfIcon />} variant="outlined" onClick={downloadPdf}>
          Télécharger le PDF
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={onClose}>
          J'ai enregistré le document
        </Button>
      </DialogActions>
    </Dialog>
  );
}

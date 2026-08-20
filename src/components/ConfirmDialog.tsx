import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

// Shared confirmation gate for destructive admin actions (delete user,
// delete request, delete attachment, purge all requests) — every one of
// them must ask before executing, per the mission requirement.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  danger = true,
  loading = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: 13 }}>{description}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button variant="contained" color={danger ? 'error' : 'primary'} onClick={onConfirm} disabled={loading}>
          {loading ? 'En cours…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import { Box } from '@mui/material';
import type { AuthUser, LeaveRequest, RequestStatus } from '../types/api';
import { REQUEST_STATUS_LABELS } from '../types/labels';
import { TONE_COLORS, requestTone, statusTone, type Tone } from '../theme/statusColors';

// Badge de statut. Passé `request` et `user`, il devient contextuel : orange
// quand l'utilisateur connecté a une action à faire sur ce dossier. Utilisé
// sans eux (tableau de bord), il s'en tient à la teinte du statut.
export function StatusBadge({
  status,
  request,
  user,
  tone,
}: {
  status: RequestStatus;
  request?: Parameters<typeof requestTone>[0];
  user?: AuthUser | null;
  tone?: Tone;
}) {
  const resolved: Tone = tone ?? (request ? requestTone(request, user) : statusTone(status));
  const c = TONE_COLORS[resolved];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1.2,
        py: 0.4,
        borderRadius: 1.5,
        bgcolor: c.soft,
        color: c.text,
        border: `1px solid ${c.main}33`,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      {REQUEST_STATUS_LABELS[status]}
    </Box>
  );
}

export type { LeaveRequest };

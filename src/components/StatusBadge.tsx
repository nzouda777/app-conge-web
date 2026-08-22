import { Chip } from '@mui/material';
import type { RequestStatus } from '../types/api';
import { REQUEST_STATUS_COLORS, REQUEST_STATUS_LABELS } from '../types/labels';

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Chip
      size="small"
      label={REQUEST_STATUS_LABELS[status]}
      color={REQUEST_STATUS_COLORS[status] === 'default' ? undefined : REQUEST_STATUS_COLORS[status]}
      variant={REQUEST_STATUS_COLORS[status] === 'default' ? 'outlined' : 'filled'}
      sx={{ fontWeight: 600, fontSize: 11 }}
    />
  );
}

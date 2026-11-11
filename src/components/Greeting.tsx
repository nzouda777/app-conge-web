import { Box, Typography } from '@mui/material';
import type { AuthUser } from '../types/api';
import { tokens } from '../theme/tokens';

// En-tête d'accueil, partagé par les différents tableaux de bord.
export function Greeting({ user }: { user: AuthUser | null }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: tokens.brand }}>
        Bonjour, {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.email}
      </Typography>
      <Typography sx={{ fontSize: 14, color: tokens.inkSecondary }}>
        {user?.employee?.organizationUnit?.name}
      </Typography>
    </Box>
  );
}

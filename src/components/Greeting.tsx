import { Box, Typography } from '@mui/material';
import type { AuthUser } from '../types/api';

// En-tête d'accueil, partagé par les différents tableaux de bord.
export function Greeting({ user }: { user: AuthUser | null }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: '#1B4F72' }}>
        Bonjour, {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.email}
      </Typography>
      <Typography sx={{ fontSize: 13, color: '#5D6D7E' }}>
        {user?.employee?.organizationUnit?.name}
      </Typography>
    </Box>
  );
}

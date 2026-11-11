import { Box, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { tokens } from '../theme/tokens';

export function StatCard({
  label,
  value,
  sub,
  subColor,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  subColor?: string;
  icon?: ReactNode;
}) {
  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      {icon && (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1,
            bgcolor: tokens.infoSoft,
          }}
        >
          {icon}
        </Box>
      )}
      <Typography sx={{ fontSize: 13, color: tokens.inkSecondary, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 24, fontWeight: 600, color: tokens.brand, mb: 0.5 }}>{value}</Typography>
      {sub && (
        <Typography sx={{ fontSize: 13, color: subColor ?? tokens.inkSecondary }}>{sub}</Typography>
      )}
    </Paper>
  );
}

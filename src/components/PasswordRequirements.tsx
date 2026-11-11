import { Box, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUncheckedOutlined';
import { tokens } from '../theme/tokens';

// Règles reprises de la politique appliquée par l'API
// (apps/api/src/common/validators/password-policy.ts). Elles sont affichées
// AVANT la soumission : laisser l'utilisateur découvrir après coup qu'il lui
// manque une catégorie de caractères, c'est l'obliger à recommencer.
export const PASSWORD_MIN_LENGTH = 12;

const RULES = [
  { label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`, test: (v: string) => v.length >= PASSWORD_MIN_LENGTH },
  {
    label: 'Au moins trois catégories : minuscules, majuscules, chiffres, caractères spéciaux',
    test: (v: string) =>
      [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(v)).length >= 3,
  },
  { label: 'Pas une répétition du même caractère', test: (v: string) => !/^(.)\1+$/.test(v) },
];

export function passwordIssues(value: string): string[] {
  if (!value) return RULES.map((r) => r.label);
  return RULES.filter((r) => !r.test(value)).map((r) => r.label);
}

export function PasswordRequirements({ value }: { value: string }) {
  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, mt: 1, p: 0 }} aria-label="Règles du mot de passe">
      {RULES.map((rule) => {
        const ok = value.length > 0 && rule.test(value);
        return (
          <Box
            component="li"
            key={rule.label}
            sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.5 }}
          >
            {ok ? (
              <CheckCircleOutlineIcon sx={{ fontSize: 17, color: tokens.successText, mt: '2px' }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ fontSize: 17, color: tokens.inkMuted, mt: '2px' }} />
            )}
            <Typography
              sx={{ fontSize: 14, color: ok ? tokens.successText : tokens.inkSecondary }}
              // Annoncé aux lecteurs d'écran au fil de la saisie.
              aria-live="polite"
            >
              {rule.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

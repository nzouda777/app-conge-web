import { useState, type ReactNode } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import InsightsIcon from '@mui/icons-material/Insights';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { tokens } from '../theme/tokens';

const DRAWER_WIDTH = 236;

const NAV = [
  { label: 'Utilisateurs', icon: <PeopleIcon />, to: '/utilisateurs' },
  { label: 'Demandes', icon: <ListAltIcon />, to: '/demandes' },
  { label: 'Nouvelle demande', icon: <AddCircleIcon />, to: '/nouvelle-demande' },
  { label: "Journal d'audit", icon: <HistoryEduIcon />, to: '/journal' },
  { label: 'Décisions ministérielles', icon: <GavelOutlinedIcon />, to: '/decisions' },
  { label: 'Délais de traitement', icon: <TimerOutlinedIcon />, to: '/delais' },
  { label: 'Pilotage', icon: <InsightsIcon />, to: '/pilotage' },
];

// Cadre de l'interface d'administration. Volontairement distinct de celui du
// personnel : une teinte plus sombre et un bandeau explicite signalent qu'on
// est dans la console d'administration, pas dans l'espace de travail courant.
export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const isActive = (to: string) =>
    location.pathname === to || (to !== '/' && location.pathname.startsWith(`${to}/`));

  const initials =
    `${user?.employee?.firstName?.[0] ?? ''}${user?.employee?.lastName?.[0] ?? ''}`.toUpperCase() || 'A';

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', color: tokens.onBrand }}>
      <Box sx={{ p: 2, borderBottom: `1px solid ${tokens.sidebarDivider}` }}>
        <Typography sx={{ fontSize: 17, fontWeight: 700, letterSpacing: 0.3 }}>
          DGB <Box component="span" sx={{ fontWeight: 400 }}>Administration</Box>
        </Typography>
        <Typography sx={{ fontSize: 14, color: tokens.sidebarSubtle, mt: 0.25 }}>
          Console réservée
        </Typography>
      </Box>

      <List component="nav" aria-label="Navigation de l'administration" sx={{ py: 1, flex: 1 }}>
        {NAV.map((item) => {
          const active = isActive(item.to);
          return (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? 'page' : undefined}
              sx={{
                color: active ? tokens.sidebarItemActive : tokens.sidebarItem,
                bgcolor: active ? tokens.sidebarActiveBackground : 'transparent',
                borderLeft: `3px solid ${active ? tokens.sidebarActiveMarker : 'transparent'}`,
                '&:hover': { bgcolor: tokens.sidebarHover, color: tokens.onBrand },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 38 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontSize: 15 }}>{item.label}</Typography>} />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ borderColor: tokens.sidebarDivider }} />
      <ListItemButton
        onClick={() => {
          setMobileOpen(false);
          void logout().then(() => navigate('/admin-login'));
        }}
        sx={{ color: tokens.sidebarSubtle }}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: 38 }}>
          <LogoutIcon />
        </ListItemIcon>
        <ListItemText primary={<Typography sx={{ fontSize: 15 }}>Déconnexion</Typography>} />
      </ListItemButton>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100dvh' }}>
      <Box
        component="nav"
        sx={{
          display: { xs: 'none', lg: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          bgcolor: tokens.brandDark,
        }}
      >
        {drawer}
      </Box>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: tokens.brandDark },
        }}
      >
        {drawer}
      </Drawer>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <AppBar
          position="static"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: `1px solid ${tokens.border}`, bgcolor: tokens.surface }}
        >
          <Toolbar sx={{ gap: 1, minHeight: 58 }}>
            {!isDesktop && (
              <IconButton
                edge="start"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label="Ouvrir le menu"
                sx={{ color: tokens.brand }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Chip
              label="Administration"
              size="small"
              sx={{ bgcolor: tokens.brandDark, color: tokens.onBrand, fontWeight: 500 }}
            />
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ fontSize: 14, color: tokens.inkSecondary, display: { xs: 'none', sm: 'block' } }}>
              {user?.email}
            </Typography>
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Menu du compte">
              <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: tokens.accentFill }}>
                {initials}
              </Avatar>
            </IconButton>
            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  setPasswordOpen(true);
                }}
              >
                Modifier mon mot de passe
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  void logout().then(() => navigate('/admin-login'));
                }}
              >
                Déconnexion
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          id="contenu-principal"
          tabIndex={-1}
          sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 3 }, bgcolor: tokens.appBackground }}
        >
          {children}
        </Box>
      </Box>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Box>
  );
}

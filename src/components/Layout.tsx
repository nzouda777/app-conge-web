import { useState, type ReactNode } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Collapse,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import GavelIcon from '@mui/icons-material/Gavel';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import ListAltIcon from '@mui/icons-material/ListAlt';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuIcon from '@mui/icons-material/Menu';
import InsightsIcon from '@mui/icons-material/Insights';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABELS } from '../types/labels';
import { useQuery } from '@tanstack/react-query';
import { listNotifications } from '../api/misc';

const DRAWER_WIDTH = 240;

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  // lg and up = "desktop" (persistent, collapsible sidebar); below = tablet /
  // mobile (temporary overlay drawer, collapsed by default).
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  // null = on suit la page courante ; '' = l'utilisateur a tout replié.
  const [manualSection, setManualSection] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => listNotifications(true),
    enabled: !!user,
    refetchInterval: 30_000,
  });
  const unreadCount = notifications?.length ?? 0;

  if (!user) return <>{children}</>;

  const initials = `${user.employee?.firstName?.[0] ?? ''}${user.employee?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  const toggleSidebar = () => {
    if (isDesktop) setDesktopOpen((o) => !o);
    else setMobileOpen((o) => !o);
  };

  // Le menu est groupé par espace : ce que l'on fait pour soi, ce que l'on
  // fait pour les autres, et le reste. Une seule section reste ouverte à la
  // fois, ce qui garde la barre courte quel que soit le nombre de rôles.
  type NavItem = { label: string; icon: ReactNode; to: string };
  type NavSection = { key: string; title: string; items: NavItem[] };

  const sections: NavSection[] =
    user.role === 'ADMIN'
      ? [
          {
            key: 'admin',
            title: 'Administration',
            items: [
              { label: 'Utilisateurs', icon: <PeopleIcon />, to: '/admin' },
              { label: 'Demandes', icon: <ListAltIcon />, to: '/admin/requests' },
              { label: 'Décisions ministérielles', icon: <GavelOutlinedIcon />, to: '/admin/decisions' },
              { label: 'Délais de traitement', icon: <TimerOutlinedIcon />, to: '/admin/delais' },
            ],
          },
          {
            key: 'pilotage',
            title: 'Pilotage',
            items: [{ label: 'Tableau de bord', icon: <InsightsIcon />, to: '/vue-ensemble' }],
          },
        ]
      : user.role === 'DIRECTEUR_GENERAL'
        ? [
            // Le Directeur Général ne dépose pas de demande : pas d'espace
            // personnel, son tableau de bord est la vue d'ensemble.
            {
              key: 'pilotage',
              title: 'Pilotage',
              items: [{ label: 'Tableau de bord', icon: <InsightsIcon />, to: '/dashboard' }],
            },
            {
              key: 'hierarchie',
              title: 'Responsable hiérarchique',
              items: [{ label: 'Demandes à examiner', icon: <FactCheckIcon />, to: '/manager' }],
            },
            {
              key: 'general',
              title: 'Général',
              items: [{ label: 'Notifications', icon: <NotificationsIcon />, to: '/notifications' }],
            },
          ]
        : [
            {
              key: 'personnel',
              title: 'Espace personnel',
              items: [
                // « Mon espace » réunit le tableau de bord personnel et la
                // liste des demandes : c'est le même sujet.
                { label: 'Mon espace', icon: <AssignmentIcon />, to: '/dashboard' },
                { label: 'Nouvelle demande', icon: <AddCircleIcon />, to: '/requests/new' },
              ],
            },
            // Montré à qui encadre réellement du personnel, d'après la chaîne
            // hiérarchique et non d'après un rôle fixe.
            ...(user.hasSubordinates || user.role === 'TEST_INTEGRAL'
              ? [
                  {
                    key: 'hierarchie',
                    title: 'Responsable hiérarchique',
                    items: [{ label: 'Demandes à examiner', icon: <FactCheckIcon />, to: '/manager' }],
                  },
                ]
              : []),
            // La vue d'ensemble de la SDAG relève du seul Sous-Directeur ; les
            // agents de traitement ont leur propre file.
            ...(user.role === 'SOUS_DIRECTEUR_SDAG' || user.role === 'TEST_INTEGRAL'
              ? [
                  {
                    key: 'sdag',
                    title: 'Espace SDAG',
                    items: [
                      { label: 'Réception & traitement', icon: <GavelIcon />, to: '/sdag' },
                      { label: 'Tableau de bord', icon: <InsightsIcon />, to: '/vue-ensemble' },
                    ],
                  },
                ]
              : []),
            ...(user.role === 'AGENT_TRAITEMENT_SDAG'
              ? [
                  {
                    key: 'traitement',
                    title: 'Espace SDAG',
                    items: [
                      { label: 'Mes dossiers à traiter', icon: <FactCheckIcon />, to: '/mes-dossiers' },
                    ],
                  },
                ]
              : []),
            {
              key: 'general',
              title: 'Général',
              items: [{ label: 'Notifications', icon: <NotificationsIcon />, to: '/notifications' }],
            },
          ];

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/');
  // La section contenant la page courante s'ouvre d'elle-même : on ne demande
  // pas à l'utilisateur de retrouver où il se trouve.
  const sectionOfCurrentPage =
    sections.find((sec) => sec.items.some((it) => isActive(it.to)))?.key ?? sections[0]?.key ?? null;
  const openSection = manualSection ?? sectionOfCurrentPage;

  // Sidebar inner content, reused by both the desktop (persistent) and the
  // mobile (temporary) drawer.
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Box component="img" src="/logo-dgb-request-dark.svg" alt="DGB Request" sx={{ width: '100%', maxWidth: 190 }} />
      </Box>
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Avatar sx={{ bgcolor: '#2E86C1', width: 34, height: 34, fontSize: 12 }}>{initials}</Avatar>
        <Box sx={{ overflow: 'hidden' }}>
          <Typography noWrap sx={{ fontSize: 12, fontWeight: 500 }}>
            {user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email}
          </Typography>
            {/* La structure situe la personne dans l'organigramme ; le rôle,
              lui, est déjà porté par les menus auxquels elle a accès. */}
          <Typography noWrap sx={{ fontSize: 11, opacity: 0.6 }}>
            {user.employee?.organizationUnit?.name ?? ROLE_LABELS[user.role]}
          </Typography>
        </Box>
      </Box>
      <List sx={{ py: 1, flex: 1, overflowY: 'auto' }} disablePadding>
        {sections.map((sec) => {
          const open = openSection === sec.key;
          return (
            <Box key={sec.key}>
              <ListItemButton
                onClick={() => setManualSection(open ? '' : sec.key)}
                sx={{
                  py: 0.75,
                  color: 'rgba(255,255,255,0.5)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                }}
              >
                <ListItemText
                  primary={
                    <Typography sx={{ fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                      {sec.title}
                    </Typography>
                  }
                />
                {open ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
              </ListItemButton>
              <Collapse in={open} timeout="auto" unmountOnExit>
                {sec.items.map((item) => {
                  const active = isActive(item.to);
                  return (
                    <ListItemButton
                      key={item.to}
                      component={RouterLink}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      sx={{
                        color: active ? '#fff' : 'rgba(255,255,255,0.75)',
                        bgcolor: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                        borderLeft: active ? '3px solid #27AE60' : '3px solid transparent',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
                      }}
                    >
                      <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
                      <ListItemText primary={<Typography sx={{ fontSize: 13 }}>{item.label}</Typography>} />
                      {/* Seules les notifications portent une pastille : elle
                          signale du nouveau, pas un volume. */}
                      {item.to === '/notifications' && unreadCount > 0 && (
                        <Badge badgeContent={unreadCount} color="error" sx={{ mr: 1.5 }} />
                      )}
                    </ListItemButton>
                  );
                })}
              </Collapse>
            </Box>
          );
        })}
      </List>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <ListItemButton
        onClick={() => {
          setMobileOpen(false);
          logout().then(() => navigate('/login'));
        }}
        sx={{ color: 'rgba(255,255,255,0.6)' }}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
          <LogoutIcon />
        </ListItemIcon>
        <ListItemText primary={<Typography sx={{ fontSize: 13 }}>Déconnexion</Typography>} />
      </ListItemButton>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Desktop (lg+): persistent, collapsible sidebar. */}
      <Box
        component="nav"
        sx={{
          display: { xs: 'none', lg: 'block' },
          width: desktopOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          overflow: 'hidden',
          bgcolor: '#1B4F72',
          transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
        }}
      >
        <Box sx={{ width: DRAWER_WIDTH, height: '100%' }}>{drawerContent}</Box>
      </Box>

      {/* Tablet / mobile: temporary overlay drawer. */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: '#1B4F72' },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: '1px solid #e8eaed', bgcolor: '#fff' }}>
          <Toolbar sx={{ gap: 1, minHeight: 56 }}>
            <IconButton edge="start" onClick={toggleSidebar} aria-label="Ouvrir/fermer le menu" sx={{ color: '#1B4F72' }}>
              <MenuIcon />
            </IconButton>
            {/* Brand in the bar on tablet/mobile (sidebar hidden then). */}
            <Box
              component="img"
              src="/icon-dgb-request.svg"
              alt="DGB Request"
              sx={{ width: 34, height: 34, borderRadius: 1.2, display: { xs: 'block', lg: 'none' } }}
            />
            {/* « DGB » reprend le vert, le rouge et l'or du logo de la barre
                latérale, pour que la marque soit la même partout. */}
            <Typography sx={{ fontWeight: 700, fontSize: 17, display: { xs: 'block', lg: 'none' } }}>
              <Box component="span" sx={{ color: '#4CB07E' }}>D</Box>
              <Box component="span" sx={{ color: '#E2565B' }}>G</Box>
              <Box component="span" sx={{ color: '#EFC03A' }}>B</Box>
              <Box component="span" sx={{ color: '#1B4F72', fontWeight: 500, ml: 0.7 }}>Request</Box>
            </Typography>
            <Box sx={{ flex: 1 }} />
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: '#2E86C1' }}>{initials}</Avatar>
            </IconButton>
            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
              <MenuItem disabled>{user.email}</MenuItem>
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
                  logout().then(() => navigate('/login'));
                }}
              >
                Déconnexion
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 3 }, bgcolor: '#f5f6fa' }}>{children}</Box>
      </Box>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Box>
  );
}

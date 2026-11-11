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
import ListAltIcon from '@mui/icons-material/ListAlt';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import GavelIcon from '@mui/icons-material/Gavel';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuIcon from '@mui/icons-material/Menu';
import InsightsIcon from '@mui/icons-material/Insights';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABELS } from '../types/labels';
import { useQuery } from '@tanstack/react-query';
import { listNotifications } from '../api/misc';
import { tokens } from '../theme/tokens';

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
    // Seul le compteur est utile ici : on ne ramène qu'une page minimale.
    queryFn: () => listNotifications(true, { pageSize: 1 }),
    enabled: !!user,
    // Deux minutes, et non trente secondes. Chaque session interrogeait
    // l'API deux fois par minute : derrière la sortie NAT unique d'un
    // ministère, le seul rafraîchissement des notifications d'une soixantaine
    // d'utilisateurs saturait le quota de requêtes, et tout le monde recevait
    // des erreurs sans avoir rien fait.
    refetchInterval: 120_000,
  });
  const unreadCount = notifications?.unread ?? 0;

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

  // Les entrées d'administration ne figurent plus ici : l'administration a sa
  // propre interface, servie sur une autre origine et construite séparément
  // (voir vite.config.ts). Un compte ADMIN ne peut d'ailleurs pas ouvrir de
  // session sur cette interface-ci — l'API le refuse.
  const sections: NavSection[] =
    user.role === 'DIRECTEUR_GENERAL'
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
                // « Mes demandes » n'avait aucune entrée de menu : on n'y
                // accédait que par le lien « Voir tout » du tableau de bord.
                { label: 'Mes demandes', icon: <ListAltIcon />, to: '/requests' },
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

  // Entrée active = la correspondance la PLUS LONGUE, et non toute entrée
  // dont le chemin est un préfixe. Avec « Mes demandes » (/requests) et
  // « Nouvelle demande » (/requests/new) côte à côte, une simple comparaison
  // de préfixe allumait les deux à la fois sur /requests/new.
  const allPaths = sections.flatMap((sec) => sec.items.map((it) => it.to));
  const bestMatch = allPaths
    .filter((to) => location.pathname === to || location.pathname.startsWith(`${to}/`))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (to: string) => to === bestMatch;
  // La section contenant la page courante s'ouvre d'elle-même : on ne demande
  // pas à l'utilisateur de retrouver où il se trouve.
  const sectionOfCurrentPage =
    sections.find((sec) => sec.items.some((it) => isActive(it.to)))?.key ?? sections[0]?.key ?? null;
  const openSection = manualSection ?? sectionOfCurrentPage;

  // Sidebar inner content, reused by both the desktop (persistent) and the
  // mobile (temporary) drawer.
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', color: tokens.onBrand }}>
      <Box sx={{ p: 2, borderBottom: `1px solid ${tokens.sidebarDivider}` }}>
        <Box component="img" src="/logo-dgb-request-dark.svg" alt="DGB Request" sx={{ width: '100%', maxWidth: 190 }} />
      </Box>
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          borderBottom: `1px solid ${tokens.sidebarDivider}`,
        }}
      >
        <Avatar sx={{ bgcolor: tokens.accentFill, width: 36, height: 36, fontSize: 14 }}>{initials}</Avatar>
        <Box sx={{ overflow: 'hidden' }}>
          <Typography noWrap sx={{ fontSize: 15, fontWeight: 500 }}>
            {user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email}
          </Typography>
            {/* La structure situe la personne dans l'organigramme ; le rôle,
              lui, est déjà porté par les menus auxquels elle a accès. */}
          <Typography noWrap sx={{ fontSize: 14, color: tokens.sidebarSubtle }}>
            {user.employee?.organizationUnit?.name ?? ROLE_LABELS[user.role]}
          </Typography>
        </Box>
      </Box>
      <List component="nav" aria-label="Navigation principale" sx={{ py: 1, flex: 1, overflowY: 'auto' }} disablePadding>
        {sections.map((sec) => {
          const open = openSection === sec.key;
          return (
            <Box key={sec.key}>
              <ListItemButton
                onClick={() => setManualSection(open ? '' : sec.key)}
                sx={{
                  py: 0.75,
                  color: tokens.sidebarSectionTitle,
                  '&:hover': { bgcolor: tokens.sidebarHover },
                }}
              >
                <ListItemText
                  primary={
                    <Typography sx={{ fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>
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
                      aria-current={active ? 'page' : undefined}
                      sx={{
                        color: active ? tokens.sidebarItemActive : tokens.sidebarItem,
                        bgcolor: active ? tokens.sidebarActiveBackground : 'transparent',
                        borderLeft: `3px solid ${active ? tokens.sidebarActiveMarker : 'transparent'}`,
                        '&:hover': { bgcolor: tokens.sidebarHover, color: tokens.onBrand },
                      }}
                    >
                      <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
                      <ListItemText primary={<Typography sx={{ fontSize: 15 }}>{item.label}</Typography>} />
                      {/* Seules les notifications portent une pastille : elle
                          signale du nouveau, pas un volume. */}
                      {item.to === '/notifications' && unreadCount > 0 && (
                        <Badge
                          badgeContent={unreadCount}
                          // Au-delà de 99, le compte exact n'apporte rien et
                          // débordait de la pastille.
                          max={99}
                          color="error"
                          sx={{ mr: 1.5 }}
                          aria-label={`${unreadCount} notification(s) non lue(s)`}
                        />
                      )}
                    </ListItemButton>
                  );
                })}
              </Collapse>
            </Box>
          );
        })}
      </List>
      <Divider sx={{ borderColor: tokens.sidebarDivider }} />
      <ListItemButton
        onClick={() => {
          setMobileOpen(false);
          void logout().then(() => navigate('/login'));
        }}
        sx={{ color: tokens.sidebarSubtle }}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
          <LogoutIcon />
        </ListItemIcon>
        <ListItemText primary={<Typography sx={{ fontSize: 15 }}>Déconnexion</Typography>} />
      </ListItemButton>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100dvh' }}>
      {/* Desktop (lg+): persistent, collapsible sidebar. */}
      <Box
        component="nav"
        sx={{
          display: { xs: 'none', lg: 'block' },
          width: desktopOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          overflow: 'hidden',
          bgcolor: tokens.sidebarBackground,
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
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: tokens.sidebarBackground },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: `1px solid ${tokens.border}`, bgcolor: tokens.surface }}>
          <Toolbar sx={{ gap: 1, minHeight: 56 }}>
            <IconButton edge="start" onClick={toggleSidebar} aria-label="Ouvrir/fermer le menu" sx={{ color: tokens.brand }}>
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
            <Typography
              component="span"
              aria-label="DGB Request"
              sx={{ fontWeight: 700, fontSize: 17, display: { xs: 'block', lg: 'none' } }}
            >
              {/* Monogramme de la marque. Les trois couleurs du logo ne
                  satisfont pas le seuil de contraste du texte courant — la
                  règle WCAG 1.4.3 en exempte les logotypes, et « DGB Request »
                  reste lisible grâce au mot « Request » qui suit, lui en
                  contraste conforme. */}
              <Box component="span" sx={{ color: tokens.logoGreen }} aria-hidden>D</Box>
              <Box component="span" sx={{ color: tokens.logoRed }} aria-hidden>G</Box>
              <Box component="span" sx={{ color: tokens.logoGold }} aria-hidden>B</Box>
              <Box component="span" sx={{ color: tokens.brand, fontWeight: 500, ml: 0.7 }}>Request</Box>
            </Typography>
            <Box sx={{ flex: 1 }} />
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: tokens.accentFill }}>{initials}</Avatar>
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
                  void logout().then(() => navigate('/login'));
                }}
              >
                Déconnexion
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        {/* Point d'ancrage du lien d'évitement, et seul repère `main` de la
            page : il n'y en avait aucun, ce qui rend la navigation au lecteur
            d'écran purement linéaire. */}
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

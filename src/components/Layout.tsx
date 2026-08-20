import { useState, type ReactNode } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
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
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import GavelIcon from '@mui/icons-material/Gavel';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import ListAltIcon from '@mui/icons-material/ListAlt';
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
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => listNotifications(true),
    enabled: !!user,
    refetchInterval: 30_000,
  });
  const unreadCount = notifications?.length ?? 0;

  if (!user) return <>{children}</>;

  const initials = `${user.employee?.firstName?.[0] ?? ''}${user.employee?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  // ADMIN gets a separate space — administration screens only, none of the
  // normal operational (leave-request) navigation.
  const navItems: { label: string; icon: ReactNode; to: string; roles?: string[] }[] =
    user.role === 'ADMIN'
      ? [
          { label: 'Utilisateurs', icon: <PeopleIcon />, to: '/admin' },
          { label: 'Demandes', icon: <ListAltIcon />, to: '/admin/requests' },
        ]
      : [
          { label: 'Tableau de bord', icon: <DashboardIcon />, to: '/dashboard' },
          { label: 'Mes demandes', icon: <AssignmentIcon />, to: '/requests' },
          { label: 'Nouvelle demande', icon: <AddCircleIcon />, to: '/requests/new', roles: ['AGENT'] },
          {
            label: 'Demandes à examiner',
            icon: <FactCheckIcon />,
            to: '/manager',
            roles: ['RESPONSABLE_HIERARCHIQUE'],
          },
          {
            label: 'Vue SDAG',
            icon: <GavelIcon />,
            to: '/sdag',
            roles: ['SOUS_DIRECTEUR_SDAG', 'AGENT_TRAITEMENT_SDAG'],
          },
          { label: 'Notifications', icon: <NotificationsIcon />, to: '/notifications' },
        ];

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: '#1B4F72',
            color: '#fff',
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography sx={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>
            République du Cameroun
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
            DGB — Gestion des Demandes
          </Typography>
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
            <Typography sx={{ fontSize: 11, opacity: 0.6 }}>{ROLE_LABELS[user.role]}</Typography>
          </Box>
        </Box>
        <List sx={{ py: 1, flex: 1 }}>
          {navItems
            .filter((item) => !item.roles || item.roles.includes(user.role))
            .map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <ListItemButton
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  sx={{
                    color: active ? '#fff' : 'rgba(255,255,255,0.75)',
                    bgcolor: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                    borderLeft: active ? '3px solid #27AE60' : '3px solid transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={<Typography sx={{ fontSize: 13 }}>{item.label}</Typography>} />
                  {item.to === '/notifications' && unreadCount > 0 && (
                    <Badge badgeContent={unreadCount} color="error" />
                  )}
                </ListItemButton>
              );
            })}
        </List>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <ListItemButton onClick={() => logout().then(() => navigate('/login'))} sx={{ color: 'rgba(255,255,255,0.6)' }}>
          <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary={<Typography sx={{ fontSize: 13 }}>Déconnexion</Typography>} />
        </ListItemButton>
      </Drawer>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AppBar
          position="static"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: '1px solid #e8eaed', bgcolor: '#fff' }}
        >
          <Toolbar sx={{ justifyContent: 'flex-end', minHeight: 56 }}>
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: '#2E86C1' }}>{initials}</Avatar>
            </IconButton>
            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
              <MenuItem disabled>{user.email}</MenuItem>
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
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: '#f5f6fa' }}>{children}</Box>
      </Box>
    </Box>
  );
}

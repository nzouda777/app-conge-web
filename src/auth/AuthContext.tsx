import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchMe, login as loginApi, logout as logoutApi } from '../api/auth';
import { APP_SURFACE, LOGIN_PATH, setUnauthenticatedHandler } from '../api/client';
import type { AuthUser } from '../types/api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Mot de passe provisoire à changer : l'application n'affiche rien d'autre. */
  mustChangePassword: boolean;
  login: (matricule: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Message à afficher sur l'écran de connexion après une session tombée. */
  sessionNotice: string | null;
  clearSessionNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Clé de mémorisation de la page demandée avant une redirection vers la
// connexion. Après identification, on y revient — l'utilisateur atterrissait
// auparavant toujours sur le tableau de bord, quelle que soit la page qu'il
// cherchait à ouvrir.
const REDIRECT_KEY = 'dgb.redirectAfterLogin';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Accroche l'intercepteur 401/403 du client HTTP. C'est ce qui manquait : une
  // session tombée en cours d'usage laissait l'utilisateur sur une page qui
  // affichait des erreurs d'autorisation sans jamais le ramener à la connexion.
  useEffect(() => {
    setUnauthenticatedHandler((reason) => {
      if (reason === 'PASSWORD_CHANGE_REQUIRED') {
        // Le profil dira `mustChangePassword` : on relit et l'écran dédié
        // prend le relais.
        refresh();
        return;
      }
      setUser(null);
      setSessionNotice('Votre session a expiré. Reconnectez-vous pour reprendre où vous en étiez.');
      if (location.pathname !== LOGIN_PATH) {
        try {
          sessionStorage.setItem(REDIRECT_KEY, location.pathname + location.search);
        } catch {
          // Mode privé, stockage refusé : on perd seulement le retour à la page.
        }
        navigate(LOGIN_PATH, { replace: true });
      }
    });
    return () => setUnauthenticatedHandler(null);
  }, [navigate, location.pathname, location.search, refresh]);

  const login = useCallback(
    async (matricule: string, password: string) => {
      await loginApi(matricule, password, APP_SURFACE);
      const me = await fetchMe();
      setUser(me);
      setSessionNotice(null);
      return me;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // La déconnexion locale doit aboutir même si l'appel échoue : laisser
      // l'utilisateur « connecté » après un clic sur Déconnexion est pire que
      // de ne pas avoir pu effacer le cookie côté serveur. Le cookie est
      // httpOnly, on ne peut pas l'effacer ici — mais l'état local est vidé et
      // la navigation ramène à la connexion.
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      mustChangePassword: user?.mustChangePassword === true,
      login,
      logout,
      refresh,
      sessionNotice,
      clearSessionNotice: () => setSessionNotice(null),
    }),
    [user, loading, login, logout, refresh, sessionNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Page à rouvrir après identification, consommée une seule fois.
export function takeRedirectAfterLogin(): string | null {
  try {
    const value = sessionStorage.getItem(REDIRECT_KEY);
    if (value) sessionStorage.removeItem(REDIRECT_KEY);
    return value;
  } catch {
    return null;
  }
}

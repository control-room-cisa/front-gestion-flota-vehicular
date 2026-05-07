import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getHomeRoute, LOGIN_ROUTE } from './role-routes';
import { hasRole, type RolNombre } from '../types/roles.types';

const FullScreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="h-10 w-10 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
  </div>
);

/**
 * Solo accesible cuando NO hay sesión. Si ya hay sesión,
 * redirige al home del rol primario del usuario.
 */
export const PublicOnlyRoute = ({ children }: { children: ReactNode }) => {
  const { usuario, isLoading } = useAuth();

  if (isLoading) return <FullScreenLoader />;
  if (usuario) {
    return <Navigate to={getHomeRoute(usuario.roles)} replace />;
  }
  return <>{children}</>;
};

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Roles que pueden ver esta ruta. Si está vacío, basta con estar autenticado.
   */
  allowed?: RolNombre[];
}

export const ProtectedRoute = ({ children, allowed = [] }: ProtectedRouteProps) => {
  const { usuario, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenLoader />;

  if (!usuario) {
    return <Navigate to={LOGIN_ROUTE} replace state={{ from: location.pathname }} />;
  }

  if (allowed.length > 0 && !hasRole(usuario.roles, allowed)) {
    return <Navigate to={getHomeRoute(usuario.roles)} replace />;
  }

  return <>{children}</>;
};

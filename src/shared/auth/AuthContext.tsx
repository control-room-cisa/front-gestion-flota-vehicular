import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, tokenStorage } from '../http/api-client';
import { authService } from '../../modules/auth/services/auth.service';
import type {
  AuthResponseDto,
  LoginDto,
  UsuarioPublicoDto,
} from '../../modules/auth/types/auth.types';

interface AuthContextValue {
  usuario: UsuarioPublicoDto | null;
  isLoading: boolean;
  login: (credentials: LoginDto) => Promise<AuthResponseDto>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<UsuarioPublicoDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = tokenStorage.get();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authService.me();
        setUsuario(me);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          tokenStorage.clear();
        }
        setUsuario(null);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = useCallback(async (credentials: LoginDto) => {
    const result = await authService.login(credentials);
    setUsuario(result.usuario);
    return result;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUsuario(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ usuario, isLoading, login, logout }),
    [usuario, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
};

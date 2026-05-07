import { useAuth } from '../auth/AuthContext';
import { NavMenu } from './NavMenu';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
}

export const AppHeader = ({ title, subtitle }: AppHeaderProps) => {
  const { usuario, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          {subtitle && (
            <p className="text-xs uppercase tracking-wider text-slate-500">
              {subtitle}
            </p>
          )}
          <h1 className="text-xl font-bold text-slate-800 truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {usuario && (
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-700">
                {usuario.nombre} {usuario.apellido}
              </p>
              <p className="text-xs text-slate-500">
                {usuario.codigo_empleado} · {usuario.roles.join(', ')}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:border-red-300 hover:text-red-600 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
      <NavMenu />
    </header>
  );
};

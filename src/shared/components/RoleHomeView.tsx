import { useAuth } from '../auth/AuthContext';
import type { RolNombre } from '../types/roles.types';

interface RoleHomeViewProps {
  title: string;
  rol: RolNombre;
  description?: string;
}

export const RoleHomeView = ({ title, rol, description }: RoleHomeViewProps) => {
  const { usuario, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              {rol}
            </p>
            <h1 className="text-xl font-bold text-slate-800">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            {usuario && (
              <div className="text-right">
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
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Bienvenido, {usuario?.nombre}
          </h2>
          <p className="text-slate-600">
            {description ??
              `Esta es la pantalla principal del rol ${rol}. Aquí irán los módulos disponibles para este perfil.`}
          </p>
        </div>
      </main>
    </div>
  );
};

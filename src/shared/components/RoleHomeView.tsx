import { useAuth } from '../auth/AuthContext';
import type { RolNombre } from '../types/roles.types';

interface RoleHomeViewProps {
  title: string;
  rol: RolNombre;
  description?: string;
}

export const RoleHomeView = ({ title, rol, description }: RoleHomeViewProps) => {
  const { usuario } = useAuth();

  return (
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
          <p className="text-sm text-slate-500 mb-4">
            Bienvenido, {usuario?.nombre}
          </p>
          <p className="text-slate-600">
            {description ??
              `Esta es la pantalla principal del rol ${rol}. Aquí irán los módulos disponibles para este perfil.`}
          </p>
        </div>
      </main>
  );
};

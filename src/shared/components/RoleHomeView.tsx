import { useAuth } from '../auth/AuthContext';
import type { RolNombre } from '../types/roles.types';
import { AppHeader } from './AppHeader';

interface RoleHomeViewProps {
  title: string;
  rol: RolNombre;
  description?: string;
}

export const RoleHomeView = ({ title, rol, description }: RoleHomeViewProps) => {
  const { usuario } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader title={title} subtitle={rol} />

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

import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getAccessibleModules } from '../auth/modules';

/**
 * Barra de navegación entre módulos. Filtra automáticamente las
 * entradas según los roles del usuario autenticado. Se renderiza
 * dentro de `AppHeader` y resalta la ruta activa.
 */
export const NavMenu = () => {
  const { usuario } = useAuth();
  if (!usuario) return null;

  const modules = getAccessibleModules(usuario.roles);
  if (modules.length === 0) return null;

  return (
    <nav className="border-t border-slate-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 flex gap-1 overflow-x-auto">
        {modules.map((m) => (
          <NavLink
            key={m.path}
            to={m.path}
            className={({ isActive }) =>
              [
                'px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-slate-600 border-transparent hover:text-indigo-600 hover:border-indigo-200',
              ].join(' ')
            }
          >
            {m.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

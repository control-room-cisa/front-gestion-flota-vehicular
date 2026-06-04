import { Outlet, useMatches } from 'react-router-dom';
import { AppTopBar } from './AppTopBar';
import { NavMenu } from './NavMenu';

export type AppRouteHandle = {
  title: string;
  subtitle?: string;
};

const resolveHandle = (matches: ReturnType<typeof useMatches>): AppRouteHandle | undefined => {
  for (let i = matches.length - 1; i >= 0; i--) {
    const h = matches[i].handle as AppRouteHandle | undefined;
    if (h?.title) return h;
  }
  return undefined;
};

/**
 * Layout autenticado: barra superior + menú de módulos permanecen montados
 * al cambiar de ruta; solo el `<Outlet />` (contenido del módulo) se actualiza.
 */
export const AppLayout = () => {
  const matches = useMatches();
  const { title, subtitle } = resolveHandle(matches) ?? {
    title: 'Gestión de flota',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <AppTopBar title={title} subtitle={subtitle} />
        <NavMenu />
      </header>
      <Outlet />
    </div>
  );
};

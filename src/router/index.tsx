import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../modules/auth/views/LoginPage';
import { DispensadosPage } from '../modules/dispensados/views/DispensadosPage';
import { EmpresasPage } from '../modules/empresas/views/EmpresasPage';
import { MovilizacionesPage } from '../modules/movilizaciones/views/MovilizacionesPage';
import { ReportesPage } from '../modules/reportes/views/ReportesPage';
import { UsuariosPage } from '../modules/usuarios/views/UsuariosPage';
import { CategoriasPage } from '../modules/categorias/views/CategoriasPage';
import { UnidadesPage } from '../modules/unidades/views/UnidadesPage';
import { CombustiblePage } from '../modules/combustible/views/CombustiblePage';
import { ConfiguracionesPage } from '../modules/configuraciones/views/ConfiguracionesPage';
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from '../shared/auth/route-guards';
import { REPORTES_ACCESS_ROLES, DISPENSADO_MANAGER_ROLES } from '../shared/types/roles.types';
import { AppLayout } from '../shared/components/AppLayout';
import type { AppRouteHandle } from '../shared/components/AppLayout';

const h = (handle: AppRouteHandle): { handle: AppRouteHandle } => ({ handle });

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/usuarios',
        element: (
          <ProtectedRoute allowed={['admin']}>
            <UsuariosPage />
          </ProtectedRoute>
        ),
        ...h({ title: 'Usuarios', subtitle: 'Administración' }),
      },
      {
        path: '/empresas',
        element: (
          <ProtectedRoute allowed={['contabilidad', 'admin']}>
            <EmpresasPage />
          </ProtectedRoute>
        ),
        ...h({ title: 'Empresas', subtitle: 'Contabilidad' }),
      },
      {
        path: '/reportes',
        element: (
          <ProtectedRoute allowed={REPORTES_ACCESS_ROLES}>
            <ReportesPage />
          </ProtectedRoute>
        ),
        ...h({ title: 'Reportes', subtitle: 'Rendimiento y operación' }),
      },
      {
        path: '/unidades',
        element: (
          <ProtectedRoute allowed={['logistica', 'admin']}>
            <UnidadesPage />
          </ProtectedRoute>
        ),
        ...h({ title: 'Unidades', subtitle: 'Logística' }),
      },
      {
        path: '/categorias',
        element: (
          <ProtectedRoute allowed={['logistica', 'admin']}>
            <CategoriasPage />
          </ProtectedRoute>
        ),
        ...h({ title: 'Categorías', subtitle: 'Logística' }),
      },
      {
        path: '/movilizaciones',
        element: <MovilizacionesPage />,
        ...h({ title: 'Movilizaciones', subtitle: 'Ingreso de kilometrajes' }),
      },
      {
        path: '/dispensados',
        element: <DispensadosPage />,
        ...h({ title: 'Dispensados', subtitle: 'Carga de combustible' }),
      },
      {
        path: '/combustible',
        element: (
          <ProtectedRoute allowed={DISPENSADO_MANAGER_ROLES}>
            <CombustiblePage />
          </ProtectedRoute>
        ),
        ...h({ title: 'Combustible', subtitle: 'Tanque diesel' }),
      },
      {
        path: '/configuraciones',
        element: (
          <ProtectedRoute allowed={DISPENSADO_MANAGER_ROLES}>
            <ConfiguracionesPage />
          </ProtectedRoute>
        ),
        ...h({ title: 'Configuraciones', subtitle: 'Variables del sistema' }),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);

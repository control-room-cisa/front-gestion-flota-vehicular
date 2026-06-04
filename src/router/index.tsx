import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../modules/auth/views/LoginPage';
import { DispensadosPage } from '../modules/dispensados/views/DispensadosPage';
import { EmpresasPage } from '../modules/empresas/views/EmpresasPage';
import { MovilizacionesPage } from '../modules/movilizaciones/views/MovilizacionesPage';
import { ReportesPage } from '../modules/reportes/views/ReportesPage';
import { UsuariosPage } from '../modules/usuarios/views/UsuariosPage';
import { VehiculosPage } from '../modules/vehiculos/views/VehiculosPage';
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from '../shared/auth/route-guards';
import { AppLayout } from '../shared/components/AppLayout';
import type { AppRouteHandle } from '../shared/components/AppLayout';
import { RoleHomeView } from '../shared/components/RoleHomeView';

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
        path: '/admin',
        element: (
          <ProtectedRoute allowed={['admin']}>
            <RoleHomeView
              title="Panel de Administración"
              rol="admin"
            />
          </ProtectedRoute>
        ),
        ...h({ title: 'Administración', subtitle: 'Panel admin' }),
      },
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
          <ProtectedRoute allowed={['logistica', 'contabilidad', 'admin']}>
            <ReportesPage />
          </ProtectedRoute>
        ),
        ...h({ title: 'Reportes', subtitle: 'Rendimiento y operación' }),
      },
      {
        path: '/vehiculos',
        element: (
          <ProtectedRoute allowed={['logistica', 'admin']}>
            <VehiculosPage />
          </ProtectedRoute>
        ),
        ...h({ title: 'Vehículos', subtitle: 'Logística' }),
      },
      {
        path: '/monitoreo',
        element: (
          <ProtectedRoute allowed={['controlroom', 'admin']}>
            <RoleHomeView title="Sala de Control" rol="controlroom" />
          </ProtectedRoute>
        ),
        ...h({ title: 'Monitoreo', subtitle: 'Sala de control' }),
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
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);

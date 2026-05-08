import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../modules/auth/views/LoginPage';
import { DispensadosPage } from '../modules/dispensados/views/DispensadosPage';
import { EmpresasPage } from '../modules/empresas/views/EmpresasPage';
import { MovilizacionesPage } from '../modules/movilizaciones/views/MovilizacionesPage';
import { ReportesPage } from '../modules/reportes/views/ReportesPage';
import { VehiculosPage } from '../modules/vehiculos/views/VehiculosPage';
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from '../shared/auth/route-guards';
import { RoleHomeView } from '../shared/components/RoleHomeView';

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
    path: '/admin',
    element: (
      <ProtectedRoute allowed={['admin']}>
        <RoleHomeView title="Panel de Administración" rol="admin" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/empresas',
    element: (
      <ProtectedRoute allowed={['contabilidad', 'admin']}>
        <EmpresasPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reportes',
    element: (
      <ProtectedRoute allowed={['logistica', 'contabilidad', 'admin']}>
        <ReportesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vehiculos',
    element: (
      <ProtectedRoute allowed={['logistica', 'admin']}>
        <VehiculosPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/monitoreo',
    element: (
      <ProtectedRoute allowed={['controlroom', 'admin']}>
        <RoleHomeView title="Sala de Control" rol="controlroom" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/movilizaciones',
    element: (
      <ProtectedRoute>
        <MovilizacionesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dispensados',
    element: (
      <ProtectedRoute>
        <DispensadosPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);

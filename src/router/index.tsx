import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../modules/auth/views/LoginPage';
import { EmpresasPage } from '../modules/empresas/views/EmpresasPage';
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
      <ProtectedRoute allowed={['contabilidad', 'admin']}>
        <RoleHomeView title="Reportes Contables" rol="contabilidad" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vehiculos',
    element: (
      <ProtectedRoute allowed={['logistica', 'admin']}>
        <RoleHomeView title="Gestión de Vehículos" rol="logistica" />
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
      <ProtectedRoute allowed={['usuario', 'admin']}>
        <RoleHomeView title="Mis Movilizaciones" rol="usuario" />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);

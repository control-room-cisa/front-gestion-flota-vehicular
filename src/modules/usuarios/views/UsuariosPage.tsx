import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiError } from '../../../shared/http/api-client';
import {
  COL_LG,
  EllipsisVerticalIcon,
  PencilIcon,
  TableActionsHeader,
  actionsCellClass,
  iconBtnClass,
  menuDotsBtnClass,
  menuItemClass,
  tableScrollWrapClass,
} from '../../../shared/components/TableActionUi';
import type { RolNombre } from '../../../shared/types/roles.types';
import { UsuarioRolesForm } from '../components/UsuarioRolesForm';
import { usuariosService } from '../services/usuario.service';
import type {
  UpdateUsuarioRolesDto,
  UsuarioAdminDto,
} from '../types/usuario.types';

const ROL_LABEL: Record<RolNombre, string> = {
  usuario: 'Usuario',
  controlroom: 'Control',
  logistica: 'Logística',
  contabilidad: 'Contabilidad',
  almacen: 'Almacén',
  admin: 'Admin',
};

const ROL_BADGE: Record<RolNombre, string> = {
  usuario: 'bg-slate-100 text-slate-700',
  controlroom: 'bg-sky-100 text-sky-700',
  logistica: 'bg-emerald-100 text-emerald-700',
  contabilidad: 'bg-amber-100 text-amber-700',
  almacen: 'bg-purple-100 text-purple-700',
  admin: 'bg-rose-100 text-rose-700',
};

export const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState<UsuarioAdminDto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [editando, setEditando] = useState<UsuarioAdminDto | null>(null);
  const [menuAcciones, setMenuAcciones] = useState<{
    usuario: UsuarioAdminDto;
    top: number;
    right: number;
  } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const list = await usuariosService.listForAdmin();
      setUsuarios(list);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Error al cargar usuarios';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const toggleMenuAcciones = (
    e: React.MouseEvent<HTMLButtonElement>,
    usuario: UsuarioAdminDto,
  ) => {
    e.stopPropagation();
    if (menuAcciones?.usuario.id === usuario.id) {
      setMenuAcciones(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAcciones({
      usuario,
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  };

  const cerrarMenuAcciones = () => setMenuAcciones(null);

  useEffect(() => {
    if (!menuAcciones) return;
    const onScroll = () => setMenuAcciones(null);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [menuAcciones]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) => {
      const haystack = [
        u.codigo_empleado,
        u.nombre,
        u.apellido,
        u.nombre_usuario ?? '',
        u.correo_electronico ?? '',
        u.empresa?.codigo ?? '',
        u.empresa?.nombre ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [usuarios, busqueda]);

  const handleSubmit = async (data: UpdateUsuarioRolesDto) => {
    if (!editando) return;
    await usuariosService.updateRoles(editando.id, data);
    setEditando(null);
    await cargar();
  };

  return (
    <>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Lista de usuarios del sistema. Sólo es posible modificar los{' '}
            <strong>roles</strong> asignados a cada uno.
          </p>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código, nombre, correo..."
              className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-72"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className={tableScrollWrapClass}>
          <table className="w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 lg:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Código</th>
                <th className="px-3 lg:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Nombre</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 ${COL_LG}`}>Usuario</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 ${COL_LG}`}>Correo</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 ${COL_LG}`}>Empresa</th>
                <th className="px-3 lg:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Roles</th>
                <TableActionsHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Cargando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Sin registros</td></tr>
              ) : (
                filtrados.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 lg:px-4 py-3 font-mono text-sm text-slate-800">{u.codigo_empleado}</td>
                    <td className="px-3 lg:px-4 py-3 text-sm text-slate-800">
                      <div className="font-semibold">
                        {u.nombre} {u.apellido}
                      </div>
                      {u.empresa && (
                        <div className="text-xs text-slate-500 lg:hidden">
                          <span className="font-mono">{u.empresa.codigo}</span>
                          {' · '}
                          {u.empresa.nombre}
                        </div>
                      )}
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs text-slate-700 ${COL_LG}`}>
                      {u.nombre_usuario ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className={`px-4 py-3 text-xs text-slate-700 ${COL_LG}`}>
                      {u.correo_electronico ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className={`px-4 py-3 text-xs text-slate-700 ${COL_LG}`}>
                      {u.empresa ? (
                        <>
                          <span className="font-mono">{u.empresa.codigo}</span>
                          <span className="text-slate-400"> · </span>
                          {u.empresa.nombre}
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 lg:px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-xs text-rose-600 font-semibold">
                            Sin roles
                          </span>
                        ) : (
                          u.roles.map((r) => (
                            <span
                              key={r}
                              className={
                                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ' +
                                ROL_BADGE[r]
                              }
                            >
                              {ROL_LABEL[r]}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className={actionsCellClass}>
                      <div className="inline-flex items-center justify-end">
                        <div className="flex sm:hidden">
                          <button
                            type="button"
                            title="Más acciones"
                            aria-label="Más acciones"
                            aria-haspopup="menu"
                            aria-expanded={menuAcciones?.usuario.id === u.id}
                            onClick={(e) => toggleMenuAcciones(e, u)}
                            className={menuDotsBtnClass}
                          >
                            <EllipsisVerticalIcon />
                          </button>
                        </div>
                        <div className="hidden sm:flex lg:hidden">
                          <button
                            type="button"
                            title="Editar roles"
                            aria-label="Editar roles"
                            onClick={() => setEditando(u)}
                            className={`${iconBtnClass} inline-flex border-slate-200 text-slate-600 hover:bg-slate-50`}
                          >
                            <PencilIcon />
                          </button>
                        </div>
                        <div className="hidden lg:block">
                          <button
                            type="button"
                            onClick={() => setEditando(u)}
                            className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
                          >
                            Editar rol
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </main>

      <UsuarioRolesForm
        open={editando !== null}
        usuario={editando}
        onCancel={() => setEditando(null)}
        onSubmit={handleSubmit}
      />

      {menuAcciones &&
        createPortal(
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Cerrar menú"
              className="fixed inset-0 z-40 cursor-default bg-transparent"
              onClick={cerrarMenuAcciones}
            />
            <div
              role="menu"
              aria-label="Acciones de usuario"
              style={{
                position: 'fixed',
                top: menuAcciones.top,
                right: menuAcciones.right,
              }}
              className="z-50 min-w-[10.5rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className={`${menuItemClass} text-slate-700`}
                onClick={() => {
                  setEditando(menuAcciones.usuario);
                  cerrarMenuAcciones();
                }}
              >
                <PencilIcon className="h-4 w-4 shrink-0 text-slate-500" />
                Editar rol
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
};

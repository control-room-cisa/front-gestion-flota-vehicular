import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiError } from '../../../shared/http/api-client';
import { useConfirm } from '../../../shared/components/ConfirmProvider';
import {
  ArrowPathIcon,
  COL_LG,
  EllipsisVerticalIcon,
  NoSymbolIcon,
  PencilIcon,
  TableActionsHeader,
  TrashIcon,
  actionsCellClass,
  iconBtnClass,
  menuDotsBtnClass,
  menuItemClass,
  tableScrollWrapClass,
} from '../../../shared/components/TableActionUi';
import { EmpresaForm } from '../components/EmpresaForm';
import { empresaService } from '../services/empresa.service';
import type {
  CreateEmpresaDto,
  EmpresaDto,
  UpdateEmpresaDto,
} from '../types/empresa.types';

type Modo =
  | { tipo: 'oculto' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; empresa: EmpresaDto };

export const EmpresasPage = () => {
  const confirm = useConfirm();
  const [empresas, setEmpresas] = useState<EmpresaDto[]>([]);
  const [incluirInactivas, setIncluirInactivas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [modo, setModo] = useState<Modo>({ tipo: 'oculto' });
  const [menuAcciones, setMenuAcciones] = useState<{
    empresa: EmpresaDto;
    top: number;
    right: number;
  } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const list = await empresaService.list(incluirInactivas);
      setEmpresas(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  }, [incluirInactivas]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const toggleMenuAcciones = (
    e: React.MouseEvent<HTMLButtonElement>,
    empresa: EmpresaDto,
  ) => {
    e.stopPropagation();
    if (menuAcciones?.empresa.id === empresa.id) {
      setMenuAcciones(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAcciones({
      empresa,
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

  const handleSubmit = async (data: CreateEmpresaDto | UpdateEmpresaDto) => {
    if (modo.tipo === 'crear') {
      await empresaService.create(data as CreateEmpresaDto);
    } else if (modo.tipo === 'editar') {
      await empresaService.update(modo.empresa.id, data);
    }
    setModo({ tipo: 'oculto' });
    await cargar();
  };

  const toggleActivo = async (empresa: EmpresaDto) => {
    const accion = empresa.activo ? 'inactivar' : 'reactivar';
    const ok = await confirm({
      title: empresa.activo ? 'Inactivar empresa' : 'Reactivar empresa',
      message: `¿Seguro que deseas ${accion} la empresa ${empresa.codigo}?`,
      confirmText: empresa.activo ? 'Inactivar' : 'Reactivar',
      variant: empresa.activo ? 'warning' : 'info',
    });
    if (!ok) return;
    try {
      await empresaService.setActivo(empresa.id, !empresa.activo);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo actualizar la empresa';
      window.alert(msg);
    }
  };

  const eliminar = async (empresa: EmpresaDto) => {
    const ok = await confirm({
      title: 'Eliminar empresa',
      message: `¿Eliminar la empresa ${empresa.codigo}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await empresaService.remove(empresa.id);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo eliminar la empresa';
      window.alert(msg);
    }
  };

  const toggleIconBtnClass = (activo: boolean) =>
    `${iconBtnClass} inline-flex ` +
    (activo
      ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50');

  const toggleTextBtnClass = (activo: boolean) =>
    'px-3 py-1 text-xs font-semibold rounded-lg border ' +
    (activo
      ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50');

  return (
    <>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={incluirInactivas}
              onChange={(e) => setIncluirInactivas(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Mostrar empresas inactivas
          </label>

          {modo.tipo === 'oculto' && (
            <button
              type="button"
              onClick={() => setModo({ tipo: 'crear' })}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
            >
              + Nueva empresa
            </button>
          )}
        </div>

        {modo.tipo !== 'oculto' && (
          <EmpresaForm
            initial={modo.tipo === 'editar' ? modo.empresa : null}
            onCancel={() => setModo({ tipo: 'oculto' })}
            onSubmit={handleSubmit}
          />
        )}

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
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 ${COL_LG}`}>Estado</th>
                <TableActionsHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Cargando...</td></tr>
              ) : empresas.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Sin registros</td></tr>
              ) : (
                empresas.map((e) => (
                  <tr key={e.id} className={e.activo ? '' : 'bg-slate-50/60'}>
                    <td className="px-3 lg:px-4 py-3 font-mono text-sm text-slate-800">{e.codigo}</td>
                    <td className="px-3 lg:px-4 py-3 text-sm text-slate-800">
                      <div>{e.nombre}</div>
                      <div className={`text-xs font-semibold lg:hidden ${e.activo ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {e.activo ? 'Activa' : 'Inactiva'}
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${COL_LG}`}>
                      <span
                        className={
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ' +
                          (e.activo
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600')
                        }
                      >
                        {e.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className={actionsCellClass}>
                      <div className="inline-flex items-center justify-end">
                        <div className="flex sm:hidden">
                          <button
                            type="button"
                            title="Más acciones"
                            aria-label="Más acciones"
                            aria-haspopup="menu"
                            aria-expanded={menuAcciones?.empresa.id === e.id}
                            onClick={(ev) => toggleMenuAcciones(ev, e)}
                            className={menuDotsBtnClass}
                          >
                            <EllipsisVerticalIcon />
                          </button>
                        </div>
                        <div className="hidden sm:flex lg:hidden items-center gap-1">
                          <button
                            type="button"
                            title="Editar"
                            aria-label="Editar"
                            onClick={() => setModo({ tipo: 'editar', empresa: e })}
                            className={`${iconBtnClass} inline-flex border-slate-200 text-slate-600 hover:bg-slate-50`}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            title={e.activo ? 'Inactivar' : 'Reactivar'}
                            aria-label={e.activo ? 'Inactivar' : 'Reactivar'}
                            onClick={() => toggleActivo(e)}
                            className={toggleIconBtnClass(e.activo)}
                          >
                            {e.activo ? <NoSymbolIcon /> : <ArrowPathIcon />}
                          </button>
                          <button
                            type="button"
                            title="Eliminar"
                            aria-label="Eliminar"
                            onClick={() => eliminar(e)}
                            className={`${iconBtnClass} inline-flex border-red-200 text-red-600 hover:bg-red-50`}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                        <div className="hidden lg:flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModo({ tipo: 'editar', empresa: e })}
                            className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActivo(e)}
                            className={toggleTextBtnClass(e.activo)}
                          >
                            {e.activo ? 'Inactivar' : 'Reactivar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminar(e)}
                            className="px-3 py-1 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            Eliminar
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
              aria-label="Acciones de empresa"
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
                  setModo({ tipo: 'editar', empresa: menuAcciones.empresa });
                  cerrarMenuAcciones();
                }}
              >
                <PencilIcon className="h-4 w-4 shrink-0 text-slate-500" />
                Editar
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${menuItemClass} ${
                  menuAcciones.empresa.activo
                    ? 'text-amber-700 hover:bg-amber-50'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
                onClick={() => {
                  cerrarMenuAcciones();
                  toggleActivo(menuAcciones.empresa);
                }}
              >
                {menuAcciones.empresa.activo ? (
                  <NoSymbolIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <ArrowPathIcon className="h-4 w-4 shrink-0" />
                )}
                {menuAcciones.empresa.activo ? 'Inactivar' : 'Reactivar'}
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${menuItemClass} text-red-600 hover:bg-red-50`}
                onClick={() => {
                  cerrarMenuAcciones();
                  eliminar(menuAcciones.empresa);
                }}
              >
                <TrashIcon className="h-4 w-4 shrink-0" />
                Eliminar
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
};

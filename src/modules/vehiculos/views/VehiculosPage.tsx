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
import { VehiculoForm } from '../components/VehiculoForm';
import { vehiculoService } from '../services/vehiculo.service';
import type {
  CreateVehiculoDto,
  UpdateVehiculoDto,
  VehiculoDto,
} from '../types/vehiculo.types';

type Modo =
  | { tipo: 'oculto' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; vehiculo: VehiculoDto };

export const VehiculosPage = () => {
  const confirm = useConfirm();
  const [vehiculos, setVehiculos] = useState<VehiculoDto[]>([]);
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [modo, setModo] = useState<Modo>({ tipo: 'oculto' });
  const [menuAcciones, setMenuAcciones] = useState<{
    vehiculo: VehiculoDto;
    top: number;
    right: number;
  } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const list = await vehiculoService.list(incluirInactivos);
      setVehiculos(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar vehículos');
    } finally {
      setLoading(false);
    }
  }, [incluirInactivos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const toggleMenuAcciones = (
    e: React.MouseEvent<HTMLButtonElement>,
    vehiculo: VehiculoDto,
  ) => {
    e.stopPropagation();
    if (menuAcciones?.vehiculo.id === vehiculo.id) {
      setMenuAcciones(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAcciones({
      vehiculo,
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

  const handleSubmit = async (data: CreateVehiculoDto | UpdateVehiculoDto) => {
    if (modo.tipo === 'crear') {
      await vehiculoService.create(data as CreateVehiculoDto);
    } else if (modo.tipo === 'editar') {
      await vehiculoService.update(modo.vehiculo.id, data);
    }
    setModo({ tipo: 'oculto' });
    await cargar();
  };

  const toggleActivo = async (vehiculo: VehiculoDto) => {
    const accion = vehiculo.activo ? 'inactivar' : 'reactivar';
    const ok = await confirm({
      title: vehiculo.activo ? 'Inactivar vehículo' : 'Reactivar vehículo',
      message: `¿Seguro que deseas ${accion} el vehículo ${vehiculo.clase}?`,
      confirmText: vehiculo.activo ? 'Inactivar' : 'Reactivar',
      variant: vehiculo.activo ? 'warning' : 'info',
    });
    if (!ok) return;
    try {
      await vehiculoService.setActivo(vehiculo.id, !vehiculo.activo);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo actualizar el vehículo';
      window.alert(msg);
    }
  };

  const eliminar = async (vehiculo: VehiculoDto) => {
    const ok = await confirm({
      title: 'Eliminar vehículo',
      message: `¿Eliminar el vehículo ${vehiculo.clase}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await vehiculoService.remove(vehiculo.id);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo eliminar el vehículo';
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
              checked={incluirInactivos}
              onChange={(e) => setIncluirInactivos(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Mostrar vehículos inactivos
          </label>

          {modo.tipo === 'oculto' && (
            <button
              type="button"
              onClick={() => setModo({ tipo: 'crear' })}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
            >
              + Nuevo vehículo
            </button>
          )}
        </div>

        {modo.tipo !== 'oculto' && (
          <VehiculoForm
            initial={modo.tipo === 'editar' ? modo.vehiculo : null}
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
              ) : vehiculos.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Sin registros</td></tr>
              ) : (
                vehiculos.map((v) => (
                  <tr key={v.id} className={v.activo ? '' : 'bg-slate-50/60'}>
                    <td className="px-3 lg:px-4 py-3 font-mono text-sm text-slate-800">{v.clase}</td>
                    <td className="px-3 lg:px-4 py-3 text-sm text-slate-800">
                      <div>{v.nombre}</div>
                      <div className={`text-xs font-semibold lg:hidden ${v.activo ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {v.activo ? 'Activo' : 'Inactivo'}
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${COL_LG}`}>
                      <span
                        className={
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ' +
                          (v.activo
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600')
                        }
                      >
                        {v.activo ? 'Activo' : 'Inactivo'}
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
                            aria-expanded={menuAcciones?.vehiculo.id === v.id}
                            onClick={(e) => toggleMenuAcciones(e, v)}
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
                            onClick={() => setModo({ tipo: 'editar', vehiculo: v })}
                            className={`${iconBtnClass} inline-flex border-slate-200 text-slate-600 hover:bg-slate-50`}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            title={v.activo ? 'Inactivar' : 'Reactivar'}
                            aria-label={v.activo ? 'Inactivar' : 'Reactivar'}
                            onClick={() => toggleActivo(v)}
                            className={toggleIconBtnClass(v.activo)}
                          >
                            {v.activo ? <NoSymbolIcon /> : <ArrowPathIcon />}
                          </button>
                          <button
                            type="button"
                            title="Eliminar"
                            aria-label="Eliminar"
                            onClick={() => eliminar(v)}
                            className={`${iconBtnClass} inline-flex border-red-200 text-red-600 hover:bg-red-50`}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                        <div className="hidden lg:flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModo({ tipo: 'editar', vehiculo: v })}
                            className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActivo(v)}
                            className={toggleTextBtnClass(v.activo)}
                          >
                            {v.activo ? 'Inactivar' : 'Reactivar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminar(v)}
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
              aria-label="Acciones de vehículo"
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
                  setModo({ tipo: 'editar', vehiculo: menuAcciones.vehiculo });
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
                  menuAcciones.vehiculo.activo
                    ? 'text-amber-700 hover:bg-amber-50'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
                onClick={() => {
                  cerrarMenuAcciones();
                  toggleActivo(menuAcciones.vehiculo);
                }}
              >
                {menuAcciones.vehiculo.activo ? (
                  <NoSymbolIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <ArrowPathIcon className="h-4 w-4 shrink-0" />
                )}
                {menuAcciones.vehiculo.activo ? 'Inactivar' : 'Reactivar'}
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${menuItemClass} text-red-600 hover:bg-red-50`}
                onClick={() => {
                  cerrarMenuAcciones();
                  eliminar(menuAcciones.vehiculo);
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

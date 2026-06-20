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
import { categoriaService } from '../../categorias/services/categoria.service';
import type { CategoriaDto } from '../../categorias/types/categoria.types';
import { findCategoriaVehiculosLivianos } from '../../categorias/types/categoria.types';
import { UnidadForm } from '../components/UnidadForm';
import { unidadService } from '../services/unidad.service';
import type {
  CreateUnidadDto,
  UnidadDto,
  UpdateUnidadDto,
} from '../types/unidad.types';
import { TIPO_COMBUSTIBLE_LABELS, TIPO_MEDICION_LABELS } from '../types/unidad.types';

type Modo =
  | { tipo: 'oculto' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; unidad: UnidadDto };

export const UnidadesPage = () => {
  const confirm = useConfirm();
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | ''>('');
  const [unidades, setUnidades] = useState<UnidadDto[]>([]);
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [modo, setModo] = useState<Modo>({ tipo: 'oculto' });
  const [menuAcciones, setMenuAcciones] = useState<{
    unidad: UnidadDto;
    top: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    categoriaService
      .list(true)
      .then((list) => {
        setCategorias(list);
        const defecto = findCategoriaVehiculosLivianos(list);
        if (defecto) {
          setCategoriaFiltro((prev) => (prev === '' ? defecto.id : prev));
        }
      })
      .catch(() => setCategorias([]));
  }, []);

  const cargar = useCallback(async () => {
    if (categoriaFiltro === '') {
      setUnidades([]);
      setLoading(false);
      setError(undefined);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const list = await unidadService.list({
        incluirInactivos,
        categoriaId: categoriaFiltro,
      });
      setUnidades(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar unidades');
    } finally {
      setLoading(false);
    }
  }, [incluirInactivos, categoriaFiltro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const onCategoriaFiltroChange = (value: number | '') => {
    setCategoriaFiltro(value);
    setModo({ tipo: 'oculto' });
  };

  const toggleMenuAcciones = (
    e: React.MouseEvent<HTMLButtonElement>,
    unidad: UnidadDto,
  ) => {
    e.stopPropagation();
    if (menuAcciones?.unidad.id === unidad.id) {
      setMenuAcciones(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAcciones({
      unidad,
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

  const handleSubmit = async (data: CreateUnidadDto | UpdateUnidadDto) => {
    if (modo.tipo === 'crear') {
      await unidadService.create(data as CreateUnidadDto);
    } else if (modo.tipo === 'editar') {
      await unidadService.update(modo.unidad.id, data);
    }
    setModo({ tipo: 'oculto' });
    await cargar();
  };

  const toggleActivo = async (unidad: UnidadDto) => {
    const accion = unidad.activo ? 'inactivar' : 'reactivar';
    const ok = await confirm({
      title: unidad.activo ? 'Inactivar unidad' : 'Reactivar unidad',
      message: `¿Seguro que deseas ${accion} la unidad ${unidad.clase}?`,
      confirmText: unidad.activo ? 'Inactivar' : 'Reactivar',
      variant: unidad.activo ? 'warning' : 'info',
    });
    if (!ok) return;
    try {
      await unidadService.setActivo(unidad.id, !unidad.activo);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo actualizar la unidad';
      window.alert(msg);
    }
  };

  const eliminar = async (unidad: UnidadDto) => {
    const ok = await confirm({
      title: 'Eliminar unidad',
      message: `¿Eliminar la unidad ${unidad.clase}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await unidadService.remove(unidad.id);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo eliminar la unidad';
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1 min-w-[12rem]">
              <label className="text-sm font-semibold text-slate-700">Categoría</label>
              <select
                value={categoriaFiltro}
                onChange={(e) =>
                  onCategoriaFiltroChange(
                    e.target.value ? Number(e.target.value) : '',
                  )
                }
                className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              >
                <option value="">Seleccionar categoría...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                    {!c.activo ? ' (inactiva)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 pb-2">
              <input
                type="checkbox"
                checked={incluirInactivos}
                onChange={(e) => setIncluirInactivos(e.target.checked)}
                disabled={categoriaFiltro === ''}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
              />
              Mostrar unidades inactivas
            </label>
          </div>

          {modo.tipo === 'oculto' && (
            <button
              type="button"
              onClick={() => setModo({ tipo: 'crear' })}
              disabled={categoriaFiltro === ''}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Nueva unidad
            </button>
          )}
        </div>

        {modo.tipo !== 'oculto' && (
          <UnidadForm
            initial={modo.tipo === 'editar' ? modo.unidad : null}
            defaultCategoriaId={
              modo.tipo === 'crear' && categoriaFiltro !== ''
                ? categoriaFiltro
                : undefined
            }
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
                  <th className="px-3 lg:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Medición</th>
                  <th className="px-3 lg:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Combustible</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 ${COL_LG}`}>Estado</th>
                  <TableActionsHeader />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoriaFiltro === '' ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Selecciona una categoría para ver las unidades
                    </td>
                  </tr>
                ) : loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Cargando...</td></tr>
                ) : unidades.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Sin registros en esta categoría</td></tr>
                ) : (
                  unidades.map((u) => (
                    <tr key={u.id} className={u.activo ? '' : 'bg-slate-50/60'}>
                      <td className="px-3 lg:px-4 py-3 font-mono text-sm text-slate-800">{u.clase}</td>
                      <td className="px-3 lg:px-4 py-3 text-sm text-slate-800">
                        <div>{u.nombre}</div>
                        <div className={`text-xs font-semibold lg:hidden ${u.activo ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </div>
                      </td>
                      <td className="px-3 lg:px-4 py-3 text-sm text-slate-700">{TIPO_MEDICION_LABELS[u.tipoMedicion]}</td>
                      <td className="px-3 lg:px-4 py-3 text-sm text-slate-700">{TIPO_COMBUSTIBLE_LABELS[u.tipoCombustible]}</td>
                      <td className={`px-4 py-3 ${COL_LG}`}>
                        <span
                          className={
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ' +
                            (u.activo
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600')
                          }
                        >
                          {u.activo ? 'Activo' : 'Inactivo'}
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
                              aria-expanded={menuAcciones?.unidad.id === u.id}
                              onClick={(e) => toggleMenuAcciones(e, u)}
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
                              onClick={() => setModo({ tipo: 'editar', unidad: u })}
                              className={`${iconBtnClass} inline-flex border-slate-200 text-slate-600 hover:bg-slate-50`}
                            >
                              <PencilIcon />
                            </button>
                            <button
                              type="button"
                              title={u.activo ? 'Inactivar' : 'Reactivar'}
                              aria-label={u.activo ? 'Inactivar' : 'Reactivar'}
                              onClick={() => toggleActivo(u)}
                              className={toggleIconBtnClass(u.activo)}
                            >
                              {u.activo ? <NoSymbolIcon /> : <ArrowPathIcon />}
                            </button>
                            <button
                              type="button"
                              title="Eliminar"
                              aria-label="Eliminar"
                              onClick={() => eliminar(u)}
                              className={`${iconBtnClass} inline-flex border-red-200 text-red-600 hover:bg-red-50`}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                          <div className="hidden lg:flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setModo({ tipo: 'editar', unidad: u })}
                              className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleActivo(u)}
                              className={toggleTextBtnClass(u.activo)}
                            >
                              {u.activo ? 'Inactivar' : 'Reactivar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminar(u)}
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
              aria-label="Acciones de unidad"
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
                  setModo({ tipo: 'editar', unidad: menuAcciones.unidad });
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
                  menuAcciones.unidad.activo
                    ? 'text-amber-700 hover:bg-amber-50'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
                onClick={() => {
                  cerrarMenuAcciones();
                  toggleActivo(menuAcciones.unidad);
                }}
              >
                {menuAcciones.unidad.activo ? (
                  <NoSymbolIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <ArrowPathIcon className="h-4 w-4 shrink-0" />
                )}
                {menuAcciones.unidad.activo ? 'Inactivar' : 'Reactivar'}
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${menuItemClass} text-red-600 hover:bg-red-50`}
                onClick={() => {
                  cerrarMenuAcciones();
                  eliminar(menuAcciones.unidad);
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

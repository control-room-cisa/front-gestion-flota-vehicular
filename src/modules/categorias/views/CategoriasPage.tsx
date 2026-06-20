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
  menuDotsBtnClass,
  menuItemClass,
  tableScrollWrapClass,
} from '../../../shared/components/TableActionUi';
import { CategoriaForm } from '../components/CategoriaForm';
import { categoriaService } from '../services/categoria.service';
import type {
  CategoriaDto,
  CreateCategoriaDto,
  UpdateCategoriaDto,
} from '../types/categoria.types';

type Modo =
  | { tipo: 'oculto' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; categoria: CategoriaDto };

export const CategoriasPage = () => {
  const confirm = useConfirm();
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);
  const [incluirInactivas, setIncluirInactivas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [modo, setModo] = useState<Modo>({ tipo: 'oculto' });
  const [menuAcciones, setMenuAcciones] = useState<{
    categoria: CategoriaDto;
    top: number;
    right: number;
  } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const list = await categoriaService.list(incluirInactivas);
      setCategorias(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  }, [incluirInactivas]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const toggleMenuAcciones = (
    e: React.MouseEvent<HTMLButtonElement>,
    categoria: CategoriaDto,
  ) => {
    e.stopPropagation();
    if (menuAcciones?.categoria.id === categoria.id) {
      setMenuAcciones(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAcciones({
      categoria,
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

  const handleSubmit = async (data: CreateCategoriaDto | UpdateCategoriaDto) => {
    if (modo.tipo === 'crear') {
      await categoriaService.create(data as CreateCategoriaDto);
    } else if (modo.tipo === 'editar') {
      await categoriaService.update(modo.categoria.id, data);
    }
    setModo({ tipo: 'oculto' });
    await cargar();
  };

  const toggleActivo = async (categoria: CategoriaDto) => {
    const accion = categoria.activo ? 'inactivar' : 'reactivar';
    const ok = await confirm({
      title: categoria.activo ? 'Inactivar categoría' : 'Reactivar categoría',
      message: `¿Seguro que deseas ${accion} la categoría ${categoria.nombre}?`,
      confirmText: categoria.activo ? 'Inactivar' : 'Reactivar',
      variant: categoria.activo ? 'warning' : 'info',
    });
    if (!ok) return;
    try {
      await categoriaService.setActivo(categoria.id, !categoria.activo);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo actualizar la categoría';
      window.alert(msg);
    }
  };

  const eliminar = async (categoria: CategoriaDto) => {
    const ok = await confirm({
      title: 'Eliminar categoría',
      message: `¿Eliminar la categoría ${categoria.nombre}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await categoriaService.remove(categoria.id);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo eliminar la categoría';
      window.alert(msg);
    }
  };

  const toggleTextBtnClass = (activo: boolean) =>
    'px-3 py-1 text-xs font-semibold rounded-lg border ' +
    (activo
      ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50');

  return (
    <>
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={incluirInactivas}
              onChange={(e) => setIncluirInactivas(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Mostrar categorías inactivas
          </label>

          {modo.tipo === 'oculto' && (
            <button
              type="button"
              onClick={() => setModo({ tipo: 'crear' })}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
            >
              + Nueva categoría
            </button>
          )}
        </div>

        {modo.tipo !== 'oculto' && (
          <CategoriaForm
            initial={modo.tipo === 'editar' ? modo.categoria : null}
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
                  <th className="px-3 lg:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Nombre</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 ${COL_LG}`}>Estado</th>
                  <TableActionsHeader />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Cargando...</td></tr>
                ) : categorias.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Sin registros</td></tr>
                ) : (
                  categorias.map((c) => (
                    <tr key={c.id} className={c.activo ? '' : 'bg-slate-50/60'}>
                      <td className="px-3 lg:px-4 py-3 text-sm text-slate-800">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{c.nombre}</span>
                          {!c.editable && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                              Sistema
                            </span>
                          )}
                        </div>
                        <div className={`text-xs font-semibold lg:hidden ${c.activo ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {c.activo ? 'Activa' : 'Inactiva'}
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${COL_LG}`}>
                        <span
                          className={
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ' +
                            (c.activo
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600')
                          }
                        >
                          {c.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className={actionsCellClass}>
                        {c.editable ? (
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setModo({ tipo: 'editar', categoria: c })}
                              className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleActivo(c)}
                              className={toggleTextBtnClass(c.activo)}
                            >
                              {c.activo ? 'Inactivar' : 'Reactivar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminar(c)}
                              className="px-3 py-1 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                            <button
                              type="button"
                              title="Más acciones"
                              className={`${menuDotsBtnClass} sm:hidden`}
                              onClick={(e) => toggleMenuAcciones(e, c)}
                            >
                              <EllipsisVerticalIcon />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No editable</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {menuAcciones?.categoria.editable &&
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
                  setModo({ tipo: 'editar', categoria: menuAcciones.categoria });
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
                  menuAcciones.categoria.activo
                    ? 'text-amber-700 hover:bg-amber-50'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
                onClick={() => {
                  cerrarMenuAcciones();
                  toggleActivo(menuAcciones.categoria);
                }}
              >
                {menuAcciones.categoria.activo ? (
                  <NoSymbolIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <ArrowPathIcon className="h-4 w-4 shrink-0" />
                )}
                {menuAcciones.categoria.activo ? 'Inactivar' : 'Reactivar'}
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${menuItemClass} text-red-600 hover:bg-red-50`}
                onClick={() => {
                  cerrarMenuAcciones();
                  eliminar(menuAcciones.categoria);
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

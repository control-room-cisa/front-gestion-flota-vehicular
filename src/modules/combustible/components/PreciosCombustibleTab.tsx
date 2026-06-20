import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConfirm } from '../../../shared/components/ConfirmProvider';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TableActionsHeader,
  TrashIcon,
  actionsCellClass,
  menuDotsBtnClass,
  menuItemClass,
  tableScrollWrapClass,
} from '../../../shared/components/TableActionUi';
import { ApiError } from '../../../shared/http/api-client';
import { PrecioCombustibleForm } from './PrecioCombustibleForm';
import { precioCombustibleService } from '../services/precio-combustible.service';
import type {
  CreatePrecioCombustibleDto,
  PrecioCombustibleDto,
  UpdatePrecioCombustibleDto,
} from '../types/precio-combustible.types';
import { TIPO_COMBUSTIBLE_PRECIO_LABELS } from '../types/precio-combustible.types';

type Modo =
  | { tipo: 'oculto' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; precio: PrecioCombustibleDto };

const PAGE_SIZE = 5;

const formatFecha = (iso: string): string =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-GT', {
    dateStyle: 'short',
  });

const formatPrecio = (raw: string): string => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const PreciosCombustibleTab = () => {
  const confirm = useConfirm();
  const [precios, setPrecios] = useState<PrecioCombustibleDto[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [modo, setModo] = useState<Modo>({ tipo: 'oculto' });
  const [menuAcciones, setMenuAcciones] = useState<{
    precio: PrecioCombustibleDto;
    top: number;
    right: number;
  } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await precioCombustibleService.list({
        page,
        pageSize: PAGE_SIZE,
      });
      setPrecios(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar precios de combustible',
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const desdeRegistro = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const hastaRegistro = Math.min(page * PAGE_SIZE, total);

  const toggleMenuAcciones = (
    e: React.MouseEvent<HTMLButtonElement>,
    precio: PrecioCombustibleDto,
  ) => {
    e.stopPropagation();
    if (menuAcciones?.precio.id === precio.id) {
      setMenuAcciones(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAcciones({
      precio,
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  };

  useEffect(() => {
    if (!menuAcciones) return;
    const onScroll = () => setMenuAcciones(null);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [menuAcciones]);

  const handleSubmit = async (
    data: CreatePrecioCombustibleDto | UpdatePrecioCombustibleDto,
  ) => {
    if (modo.tipo === 'crear') {
      await precioCombustibleService.create(data as CreatePrecioCombustibleDto);
      setPage(1);
    } else if (modo.tipo === 'editar') {
      await precioCombustibleService.update(modo.precio.id, data);
    }
    setModo({ tipo: 'oculto' });
    await cargar();
  };

  const eliminar = async (precio: PrecioCombustibleDto) => {
    const ok = await confirm({
      title: 'Eliminar precio',
      message: `¿Eliminar el precio vigente del ${formatFecha(precio.fechaInicio)} al ${formatFecha(precio.fechaFin)}?`,
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await precioCombustibleService.remove(precio.id);
      if (precios.length === 1 && page > 1) setPage((p) => p - 1);
      else await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo eliminar el precio';
      window.alert(msg);
    }
  };

  return (
    <>
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Precios de combustible
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historial por tipo, ordenado por fecha descendente
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModo({ tipo: 'crear' })}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
          >
            Nuevo precio
          </button>
        </div>

        {error && (
          <p className="mx-4 mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className={tableScrollWrapClass}>
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Fecha inicio
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Fecha fin
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Precio / galón
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Combustible
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Comentario
                </th>
                <TableActionsHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Cargando…
                  </td>
                </tr>
              ) : precios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Sin registros. Agrega el primer precio de combustible.
                  </td>
                </tr>
              ) : (
                precios.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-3 text-slate-800 whitespace-nowrap">
                      {formatFecha(p.fechaInicio)}
                    </td>
                    <td className="px-3 py-3 text-slate-800 whitespace-nowrap">
                      {formatFecha(p.fechaFin)}
                    </td>
                    <td className="px-3 py-3 text-slate-700 tabular-nums font-mono">
                      L {formatPrecio(p.precioGalon)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {TIPO_COMBUSTIBLE_PRECIO_LABELS[p.tipoCombustible]}
                    </td>
                    <td className="px-3 py-3 text-slate-600 max-w-[240px] truncate">
                      {p.comentario || '—'}
                    </td>
                    <td className={actionsCellClass}>
                      <button
                        type="button"
                        className={menuDotsBtnClass}
                        aria-label="Acciones"
                        onClick={(e) => toggleMenuAcciones(e, p)}
                      >
                        <EllipsisVerticalIcon />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-sm text-slate-600">
          <span>
            {total === 0
              ? 'Sin resultados'
              : `Mostrando ${desdeRegistro}–${hastaRegistro} de ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40"
            >
              ← Anterior
            </button>
            <span className="text-xs text-slate-500">
              Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </section>

      <PrecioCombustibleForm
        open={modo.tipo !== 'oculto'}
        initial={modo.tipo === 'editar' ? modo.precio : null}
        onClose={() => setModo({ tipo: 'oculto' })}
        onSubmit={handleSubmit}
      />

      {menuAcciones &&
        createPortal(
          <div
            className="fixed z-50 min-w-[10rem] rounded-lg border border-slate-200 bg-white shadow-lg py-1"
            style={{ top: menuAcciones.top, right: menuAcciones.right }}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className={menuItemClass}
              onClick={() => {
                setModo({ tipo: 'editar', precio: menuAcciones.precio });
                setMenuAcciones(null);
              }}
            >
              <PencilIcon className="h-4 w-4 text-slate-500" />
              Editar
            </button>
            <button
              type="button"
              role="menuitem"
              className={`${menuItemClass} text-red-600`}
              onClick={() => {
                void eliminar(menuAcciones.precio);
                setMenuAcciones(null);
              }}
            >
              <TrashIcon className="h-4 w-4" />
              Eliminar
            </button>
          </div>,
          document.body,
        )}
    </>
  );
};

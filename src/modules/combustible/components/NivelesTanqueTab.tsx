import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useConfirm } from "../../../shared/components/ConfirmProvider";
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TableActionsHeader,
  TrashIcon,
  actionsCellClass,
  menuDotsBtnClass,
  menuItemClass,
  tableScrollWrapClass,
} from "../../../shared/components/TableActionUi";
import { ApiError } from "../../../shared/http/api-client";
import { parseDecimalInput } from "../../../shared/utils/numeric-input";
import { NivelTanqueDieselForm } from "./NivelTanqueDieselForm";
import { TanqueVisual } from "./TanqueVisual";
import { nivelTanqueDieselService } from "../services/nivel-tanque-diesel.service";
import {
  capacidadTanqueDieselGalones,
  formatGalonesDisplay,
  volumenGalonesDesdeAlturaTanque,
} from "../utils/tanque-cilindrico";
import type {
  CreateNivelTanqueDieselDto,
  NivelTanqueDieselDto,
  UpdateNivelTanqueDieselDto,
} from "../types/nivel-tanque-diesel.types";

type Modo =
  | { tipo: "oculto" }
  | { tipo: "crear" }
  | { tipo: "editar"; nivel: NivelTanqueDieselDto };

const PAGE_SIZE = 5;

const formatFecha = (iso: string): string =>
  new Date(iso).toLocaleString("es-HN", {
    dateStyle: "short",
    timeStyle: "short",
  });

const calcPorcentaje = (volumen: number, capacidad: number): number => {
  if (capacidad <= 0) return 0;
  return Math.min(100, Math.max(0, (volumen / capacidad) * 100));
};

const volumenGalonesNivel = (n: NivelTanqueDieselDto): number =>
  volumenGalonesDesdeAlturaTanque(parseDecimalInput(n.alturaPulgadas) ?? 0) ??
  0;

type NivelConDiferencia = NivelTanqueDieselDto & {
  /** Variación de volumen vs el registro anterior (más antiguo). */
  diferenciaGal: number | null;
};

const buildNivelesConDiferencia = (
  items: NivelTanqueDieselDto[],
): NivelConDiferencia[] =>
  items.map((n, i) => {
    const anterior = items[i + 1];
    if (!anterior) return { ...n, diferenciaGal: null };
    return {
      ...n,
      diferenciaGal: volumenGalonesNivel(n) - volumenGalonesNivel(anterior),
    };
  });

const formatDiferenciaGal = (diff: number): string => {
  const abs = formatGalonesDisplay(Math.abs(diff));
  if (diff > 0) return `+${abs}`;
  if (diff < 0) return `-${abs}`;
  return abs;
};

const CAPACIDAD_GALONES = capacidadTanqueDieselGalones();

export const NivelesTanqueTab = () => {
  const confirm = useConfirm();
  const [niveles, setNiveles] = useState<NivelTanqueDieselDto[]>([]);
  const [ultimo, setUltimo] = useState<NivelTanqueDieselDto | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [modo, setModo] = useState<Modo>({ tipo: "oculto" });
  const [menuAcciones, setMenuAcciones] = useState<{
    nivel: NivelTanqueDieselDto;
    top: number;
    right: number;
  } | null>(null);

  const cargarTanque = useCallback(async () => {
    try {
      const latest = await nivelTanqueDieselService.getLatest();
      setUltimo(latest);
    } catch {
      setUltimo(null);
    }
  }, []);

  const cargarTabla = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await nivelTanqueDieselService.list({
        page,
        pageSize: PAGE_SIZE,
      });
      setNiveles(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar niveles del tanque",
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  const cargar = useCallback(async () => {
    await Promise.all([cargarTanque(), cargarTabla()]);
  }, [cargarTanque, cargarTabla]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const porcentajeTanque = useMemo(() => {
    if (!ultimo) return 0;
    const vol = volumenGalonesNivel(ultimo);
    return calcPorcentaje(vol, CAPACIDAD_GALONES);
  }, [ultimo]);

  const nivelesConDiferencia = useMemo(
    () => buildNivelesConDiferencia(niveles),
    [niveles],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const desdeRegistro = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const hastaRegistro = Math.min(page * PAGE_SIZE, total);

  const toggleMenuAcciones = (
    e: React.MouseEvent<HTMLButtonElement>,
    nivel: NivelTanqueDieselDto,
  ) => {
    e.stopPropagation();
    if (menuAcciones?.nivel.id === nivel.id) {
      setMenuAcciones(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAcciones({
      nivel,
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  };

  useEffect(() => {
    if (!menuAcciones) return;
    const onScroll = () => setMenuAcciones(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [menuAcciones]);

  const handleSubmit = async (
    data: CreateNivelTanqueDieselDto | UpdateNivelTanqueDieselDto,
  ) => {
    if (modo.tipo === "crear") {
      await nivelTanqueDieselService.create(data as CreateNivelTanqueDieselDto);
      setPage(1);
    } else if (modo.tipo === "editar") {
      await nivelTanqueDieselService.update(modo.nivel.id, data);
    }
    setModo({ tipo: "oculto" });
    await cargar();
  };

  const eliminar = async (nivel: NivelTanqueDieselDto) => {
    const ok = await confirm({
      title: "Eliminar registro",
      message: `¿Eliminar el nivel del ${formatFecha(nivel.fecha)}?`,
      confirmText: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await nivelTanqueDieselService.remove(nivel.id);
      if (niveles.length === 1 && page > 1) setPage((p) => p - 1);
      else await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar el registro";
      window.alert(msg);
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <section className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center">
          <TanqueVisual
            porcentaje={porcentajeTanque}
            ultimo={ultimo}
            capacidadGalones={CAPACIDAD_GALONES}
          />
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Niveles del tanque
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Últimos registros, ordenados por fecha descendente
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModo({ tipo: "crear" })}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
            >
              Nuevo registro
            </button>
          </div>

          {error && (
            <p className="mx-4 mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className={tableScrollWrapClass}>
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Fecha
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Altura (pulg)
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Volumen (gal)
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Diferencia
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Relleno
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Gal. rellenados
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
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Cargando…
                    </td>
                  </tr>
                ) : niveles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Sin registros. Agrega el primer nivel del tanque.
                    </td>
                  </tr>
                ) : (
                  nivelesConDiferencia.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50/80">
                      <td className="px-3 py-3 text-slate-800 whitespace-nowrap">
                        {formatFecha(n.fecha)}
                      </td>
                      <td className="px-3 py-3 text-slate-700 tabular-nums">
                        {n.alturaPulgadas}
                      </td>
                      <td className="px-3 py-3 text-slate-700 tabular-nums">
                        {formatGalonesDisplay(volumenGalonesNivel(n))}
                      </td>
                      <td
                        className={
                          "px-3 py-3 text-right tabular-nums font-semibold whitespace-nowrap " +
                          (n.diferenciaGal === null
                            ? "text-slate-400"
                            : n.diferenciaGal > 0
                              ? "text-emerald-600"
                              : n.diferenciaGal < 0
                                ? "text-red-600"
                                : "text-slate-500")
                        }
                      >
                        {n.diferenciaGal === null
                          ? "—"
                          : formatDiferenciaGal(n.diferenciaGal)}
                      </td>
                      <td className="px-3 py-3">
                        {n.rellenoCombustible ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            Sí
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">No</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-700 tabular-nums">
                        {n.galonesRellenados ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-600 max-w-[200px] truncate">
                        {n.comentario || "—"}
                      </td>
                      <td className={actionsCellClass}>
                        <button
                          type="button"
                          className={menuDotsBtnClass}
                          aria-label="Acciones"
                          onClick={(e) => toggleMenuAcciones(e, n)}
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
                ? "Sin resultados"
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
      </div>

      <NivelTanqueDieselForm
        open={modo.tipo !== "oculto"}
        initial={modo.tipo === "editar" ? modo.nivel : null}
        onClose={() => setModo({ tipo: "oculto" })}
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
                setModo({ tipo: "editar", nivel: menuAcciones.nivel });
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
                void eliminar(menuAcciones.nivel);
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

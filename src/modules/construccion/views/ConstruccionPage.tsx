import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConfirm } from '../../../shared/components/ConfirmProvider';
import { SearchableSelect } from '../../../shared/components/SearchableSelect';
import { tableScrollWrapClass } from '../../../shared/components/TableActionUi';
import { ApiError } from '../../../shared/http/api-client';
import { isConstruccionManager } from '../../../shared/types/roles.types';
import { useAuth } from '../../../shared/auth/AuthContext';
import { categoriaService } from '../../categorias/services/categoria.service';
import type { CategoriaDto } from '../../categorias/types/categoria.types';
import { empresaService } from '../../empresas/services/empresa.service';
import type { EmpresaDto } from '../../empresas/types/empresa.types';
import { usuariosService } from '../../usuarios/services/usuario.service';
import type { UsuarioListadoDto } from '../../usuarios/types/usuario.types';
import { unidadService } from '../../unidades/services/unidad.service';
import type { UnidadDto } from '../../unidades/types/unidad.types';
import { RegistroConstruccionDetalleModal } from '../components/RegistroConstruccionDetalleModal';
import { RegistroConstruccionForm } from '../components/RegistroConstruccionForm';
import { registroConstruccionService } from '../services/registro-construccion.service';
import {
  filterUnidadesMaquinaria,
  getCategoriaVehiculosLivianosId,
  getRegistroMedicionFila,
} from '../utils/maquinaria-unidades.utils';
import type {
  CreateRegistroConstruccionDto,
  RegistroConstruccionDto,
  UpdateRegistroConstruccionDto,
} from '../types/registro-construccion.types';

type Modo =
  | { tipo: 'oculto' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; registro: RegistroConstruccionDto };

const PAGE_SIZE = 20;

const hoyISO = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const hacePocosDiasISO = (dias: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const inicioDelDiaISO = (ymd: string): string =>
  new Date(`${ymd}T00:00:00`).toISOString();

const finDelDiaISO = (ymd: string): string =>
  new Date(`${ymd}T23:59:59.999`).toISOString();

const formatFecha = (iso: string): string =>
  new Date(iso).toLocaleString('es-GT', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

export const ConstruccionPage = () => {
  const confirm = useConfirm();
  const { usuario } = useAuth();
  const isManager = isConstruccionManager(usuario?.roles);

  const [registros, setRegistros] = useState<RegistroConstruccionDto[]>([]);
  const [total, setTotal] = useState(0);
  const [unidades, setUnidades] = useState<UnidadDto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaDto[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioListadoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [modo, setModo] = useState<Modo>({ tipo: 'oculto' });
  const [detalle, setDetalle] = useState<RegistroConstruccionDto | null>(null);

  const [desde, setDesde] = useState(hacePocosDiasISO(6));
  const [hasta, setHasta] = useState(hoyISO());
  const [unidadFiltro, setUnidadFiltro] = useState<UnidadDto | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      unidadService.list({ incluirInactivos: true }),
      categoriaService.list(true),
      empresaService.list(),
      isManager ? usuariosService.list() : Promise.resolve([]),
    ])
      .then(([u, cat, e, us]) => {
        if (cancelled) return;
        setUnidades(u);
        setCategorias(cat);
        setEmpresas(e);
        setUsuarios(us);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isManager]);

  const unidadesMaquinaria = useMemo(() => {
    const livianosId = getCategoriaVehiculosLivianosId(categorias);
    return filterUnidadesMaquinaria(unidades, livianosId);
  }, [unidades, categorias]);

  const unidadesPorId = useMemo(
    () => new Map(unidades.map((u) => [u.id, u])),
    [unidades],
  );

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await registroConstruccionService.list({
        desde: inicioDelDiaISO(desde),
        hasta: finDelDiaISO(hasta),
        unidadId: unidadFiltro?.id,
        page,
        pageSize: PAGE_SIZE,
      });
      setRegistros(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar registros',
      );
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, unidadFiltro, page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setPage(1);
  }, [desde, hasta, unidadFiltro]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSubmit = async (
    data: CreateRegistroConstruccionDto | UpdateRegistroConstruccionDto,
  ) => {
    if (modo.tipo === 'crear') {
      await registroConstruccionService.create(
        data as CreateRegistroConstruccionDto,
      );
    } else if (modo.tipo === 'editar') {
      await registroConstruccionService.update(modo.registro.id, data);
    }
    setModo({ tipo: 'oculto' });
    await cargar();
  };

  const eliminar = async (registro: RegistroConstruccionDto) => {
    const ok = await confirm({
      title: 'Eliminar registro',
      message: '¿Eliminar este registro de uso de maquinaria?',
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await registroConstruccionService.remove(registro.id);
      setDetalle(null);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo eliminar';
      window.alert(msg);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Registro de uso de maquinaria (kilometraje u horómetro).
        </p>
        <button
          type="button"
          onClick={() => setModo({ tipo: 'crear' })}
          className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
        >
          + Nuevo registro
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Desde</label>
          <input
            type="date"
            value={desde}
            max={hasta}
            onChange={(e) => setDesde(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Hasta</label>
          <input
            type="date"
            value={hasta}
            min={desde}
            onChange={(e) => setHasta(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Unidad</label>
          <SearchableSelect<UnidadDto>
            options={unidadesMaquinaria.filter((u) => u.activo)}
            value={unidadFiltro}
            onChange={setUnidadFiltro}
            getKey={(u) => u.id}
            getLabel={(u) => u.nombre}
            getSubLabel={(u) => u.clase.toUpperCase()}
            getSearchText={(u) => `${u.nombre} ${u.clase}`}
            placeholder="Todas..."
            emptyText="Sin unidades"
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                  Unidad
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                  Operador
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                  Inicio
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                  Fin
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                  Uso
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                  Empresas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Sin registros
                  </td>
                </tr>
              ) : (
                registros.map((r) => {
                  const medicion = getRegistroMedicionFila(
                    r,
                    unidadesPorId.get(r.unidad.id),
                  );
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => setDetalle(r)}
                    >
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {formatFecha(r.fecha)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-mono text-xs text-slate-500">
                          {r.unidad.clase.toUpperCase()}
                        </div>
                        <div>{r.unidad.nombre}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {r.operador.nombre} {r.operador.apellido}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {medicion.inicio}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {medicion.fin}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {medicion.uso}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[12rem]">
                        {r.empresas.map((e) => e.nombre).join(', ') || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-600">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}

      <RegistroConstruccionForm
        open={modo.tipo !== 'oculto'}
        initial={modo.tipo === 'editar' ? modo.registro : null}
        empresas={empresas}
        unidades={unidadesMaquinaria}
        usuarios={usuarios}
        onClose={() => setModo({ tipo: 'oculto' })}
        onSubmit={handleSubmit}
      />

      <RegistroConstruccionDetalleModal
        open={detalle !== null}
        registro={detalle}
        onClose={() => setDetalle(null)}
        onEdit={(r) => {
          setDetalle(null);
          setModo({ tipo: 'editar', registro: r });
        }}
        onDelete={eliminar}
      />
    </main>
  );
};

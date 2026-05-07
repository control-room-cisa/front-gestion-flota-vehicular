import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../shared/auth/AuthContext';
import { Modal } from '../../../shared/components/Modal';
import { SearchableSelect } from '../../../shared/components/SearchableSelect';
import { isMovilizacionManager } from '../../../shared/types/roles.types';
import type { EmpresaDto } from '../../empresas/types/empresa.types';
import type { UsuarioListadoDto } from '../../usuarios/types/usuario.types';
import type { VehiculoDto } from '../../vehiculos/types/vehiculo.types';
import { movilizacionService } from '../services/movilizacion.service';
import type {
  CreateMovilizacionDto,
  MovilizacionDto,
  UltimaMovilizacionVehiculoDto,
  UpdateMovilizacionDto,
} from '../types/movilizacion.types';

export interface MovilizacionFormProps {
  open: boolean;
  initial?: MovilizacionDto | null;
  empresas: EmpresaDto[];
  vehiculos: VehiculoDto[];
  /**
   * Catálogo de usuarios para el selector de "dueño" del registro. Sólo se
   * usa cuando el autenticado es manager — para el resto el usuario está
   * fijo al propio.
   */
  usuarios: UsuarioListadoDto[];
  onClose: () => void;
  onSubmit: (data: CreateMovilizacionDto | UpdateMovilizacionDto) => Promise<void>;
}

const toLocalInput = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
};

const fromLocalInput = (local: string): string => new Date(local).toISOString();

/** Umbral en km a partir del cual mostramos la alerta de recorrido alto. */
const RECORRIDO_ALERTA_KM = 40;

const formatFecha = (iso: string): string =>
  new Date(iso).toLocaleString('es-GT', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

export const MovilizacionForm = ({
  open,
  initial,
  empresas,
  vehiculos,
  usuarios,
  onClose,
  onSubmit,
}: MovilizacionFormProps) => {
  const { usuario } = useAuth();
  const editing = Boolean(initial);

  const isManager = isMovilizacionManager(usuario?.roles);

  const [fecha, setFecha] = useState('');
  const [vehiculo, setVehiculo] = useState<VehiculoDto | null>(null);
  const [usuarioSel, setUsuarioSel] = useState<UsuarioListadoDto | null>(null);
  const [kmInicial, setKmInicial] = useState('');
  const [kmFinal, setKmFinal] = useState('');
  const [comentario, setComentario] = useState('');
  const [empresaIds, setEmpresaIds] = useState<number[]>([]);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const [ultima, setUltima] = useState<UltimaMovilizacionVehiculoDto | null>(
    null,
  );
  const [ultimaCargando, setUltimaCargando] = useState(false);

  // ---------------------------------------------------------------------------
  // Catálogos visibles: sólo activos. En edición conservamos el seleccionado
  // aunque haya quedado inactivo, para no perder el dato.
  // ---------------------------------------------------------------------------
  const empresasActivas = useMemo(
    () => empresas.filter((e) => e.activo),
    [empresas],
  );

  const vehiculosOptions = useMemo<VehiculoDto[]>(() => {
    const activos = vehiculos.filter((v) => v.activo);
    if (
      initial &&
      !activos.some((v) => v.id === initial.vehiculo.id)
    ) {
      return [...activos, { ...initial.vehiculo, activo: false }];
    }
    return activos;
  }, [vehiculos, initial]);

  // Opciones de usuario para managers. En edición conservamos el dueño
  // original aunque no esté en la lista (no debería pasar, pero por seguridad).
  const usuariosOptions = useMemo<UsuarioListadoDto[]>(() => {
    if (!initial) return usuarios;
    if (usuarios.some((u) => u.id === initial.usuario.id)) return usuarios;
    return [
      ...usuarios,
      {
        id: initial.usuario.id,
        codigo_empleado: initial.usuario.codigo_empleado,
        nombre: initial.usuario.nombre,
        apellido: initial.usuario.apellido,
        empresa: null,
      },
    ];
  }, [usuarios, initial]);

  // ---------------------------------------------------------------------------
  // Inicialización al abrir el modal.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;

    setFecha(toLocalInput(initial?.fecha));
    setKmInicial(initial ? String(initial.kilometrajeInicial) : '');
    setKmFinal(initial ? String(initial.kilometrajeFinal) : '');
    setComentario(initial?.comentario ?? '');
    setError(undefined);
    setUltima(null);

    // Vehículo seleccionado.
    if (initial) {
      setVehiculo(
        vehiculosOptions.find((v) => v.id === initial.vehiculo.id) ?? null,
      );
    } else {
      setVehiculo(null);
    }

    // Usuario "dueño" del registro:
    //   - En edición: el usuario que ya tenía el registro.
    //   - Creando: el usuario autenticado (auto-selección, editable si manager).
    if (initial) {
      setUsuarioSel(
        usuariosOptions.find((u) => u.id === initial.usuario.id) ??
          (usuario
            ? {
                id: initial.usuario.id,
                codigo_empleado: initial.usuario.codigo_empleado,
                nombre: initial.usuario.nombre,
                apellido: initial.usuario.apellido,
                empresa: null,
              }
            : null),
      );
    } else if (usuario) {
      // Si soy manager, intento encontrarme en el catálogo (para que el select
      // muestre el mismo objeto). Si no estoy (ej. no-manager sin endpoint),
      // construyo un dummy con la info de mi sesión.
      const enCatalogo = usuariosOptions.find((u) => u.id === usuario.id);
      setUsuarioSel(
        enCatalogo ?? {
          id: usuario.id,
          codigo_empleado: usuario.codigo_empleado,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          empresa: usuario.empresa,
        },
      );
    } else {
      setUsuarioSel(null);
    }

    // Empresas:
    //   - En edición: las que ya tenía el registro (todos los modos).
    //   - Creando + manager: pre-selecciona la empresa propia (si la tiene).
    //   - Creando + no-manager: el backend la inferirá; UI solo informa.
    if (initial) {
      setEmpresaIds(initial.empresas.map((e) => e.id));
    } else if (isManager && usuario?.empresa) {
      setEmpresaIds([usuario.empresa.id]);
    } else {
      setEmpresaIds([]);
    }
  }, [open, initial, vehiculosOptions, usuariosOptions, isManager, usuario]);

  // ---------------------------------------------------------------------------
  // Al cambiar el vehículo: cargar la última movilización del vehículo
  // (excluyendo el propio en edición) para alimentar la alerta.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    if (!vehiculo) {
      setUltima(null);
      return;
    }
    let cancelled = false;
    setUltimaCargando(true);
    movilizacionService
      .lastByVehiculo(vehiculo.id, initial?.id)
      .then((res) => {
        if (!cancelled) setUltima(res);
      })
      .catch(() => {
        if (!cancelled) setUltima(null);
      })
      .finally(() => {
        if (!cancelled) setUltimaCargando(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, vehiculo, initial?.id]);

  const toggleEmpresa = (id: number) => {
    setEmpresaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // No-manager: la empresa siempre es la del usuario. Se muestra como info
  // pero no entra al payload (el backend la inferirá).
  const empresaPropia = !isManager ? usuario?.empresa ?? null : null;
  const noTieneEmpresa = !isManager && !empresaPropia;

  // En edición + no-manager: mostramos las empresas del registro existente
  // (read-only), no la del usuario actual.
  const empresasInitialNoManager = !isManager && initial ? initial.empresas : null;

  // ---------------------------------------------------------------------------
  // Cálculos derivados (recorrido + alertas).
  // ---------------------------------------------------------------------------
  const kmIniNum = kmInicial === '' ? null : Number(kmInicial);
  const kmFinNum = kmFinal === '' ? null : Number(kmFinal);

  const recorrido =
    kmIniNum !== null &&
    kmFinNum !== null &&
    Number.isFinite(kmIniNum) &&
    Number.isFinite(kmFinNum) &&
    kmFinNum >= kmIniNum
      ? kmFinNum - kmIniNum
      : null;

  const recorridoAltoAlerta =
    recorrido !== null && recorrido > RECORRIDO_ALERTA_KM;

  const continuidadAlerta =
    ultima !== null &&
    kmIniNum !== null &&
    Number.isFinite(kmIniNum) &&
    kmIniNum !== ultima.kilometrajeFinal;

  // ---------------------------------------------------------------------------
  // Submit.
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    if (!vehiculo) {
      setError('Selecciona un vehículo');
      return;
    }
    if (isManager && !usuarioSel) {
      setError('Selecciona un usuario');
      return;
    }

    const kmIni = Number(kmInicial);
    const kmFin = Number(kmFinal);

    if (!Number.isInteger(kmIni) || !Number.isInteger(kmFin)) {
      setError('Los kilometrajes deben ser números enteros');
      return;
    }
    if (kmFin < kmIni) {
      setError('El kilometraje final debe ser mayor o igual al inicial');
      return;
    }
    if (isManager && empresaIds.length === 0) {
      setError('Selecciona al menos una empresa');
      return;
    }
    if (noTieneEmpresa) {
      setError('No tienes una empresa asignada. Contacta al administrador.');
      return;
    }
    if (!comentario.trim()) {
      setError('El comentario es obligatorio');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateMovilizacionDto | UpdateMovilizacionDto = {
        fecha: fromLocalInput(fecha),
        kilometrajeInicial: kmIni,
        kilometrajeFinal: kmFin,
        comentario: comentario.trim(),
        vehiculoId: vehiculo.id,
      };
      if (isManager) {
        (payload as CreateMovilizacionDto).empresaIds = empresaIds;
        if (usuarioSel) (payload as CreateMovilizacionDto).userId = usuarioSel.id;
      }
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const usuarioPropioLabel = usuario
    ? `${usuario.nombre} ${usuario.apellido} (${usuario.codigo_empleado})`
    : '';

  const recorridoInputClass = [
    'px-3 py-2 rounded-lg border bg-slate-100 cursor-not-allowed font-mono',
    recorridoAltoAlerta
      ? 'border-amber-400 text-amber-800'
      : 'border-slate-200 text-slate-700',
  ].join(' ');

  return (
    <Modal
      open={open}
      title={editing ? 'Editar movilización' : 'Nueva movilización'}
      subtitle="Ingreso de kilometrajes"
      size="lg"
      busy={submitting}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="movilizacion-form"
            disabled={submitting || noTieneEmpresa}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-70"
          >
            {submitting ? 'Guardando...' : editing ? 'Actualizar' : 'Registrar'}
          </button>
        </>
      }
    >
      <form id="movilizacion-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Usuario */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">Usuario</label>
          {isManager ? (
            <SearchableSelect<UsuarioListadoDto>
              options={usuariosOptions}
              value={usuarioSel}
              onChange={setUsuarioSel}
              getKey={(u) => u.id}
              getLabel={(u) => `${u.nombre} ${u.apellido}`}
              getSubLabel={(u) =>
                u.empresa
                  ? `${u.codigo_empleado} · ${u.empresa.codigo}`
                  : u.codigo_empleado
              }
              getSearchText={(u) =>
                `${u.nombre} ${u.apellido} ${u.codigo_empleado} ${u.empresa?.codigo ?? ''} ${u.empresa?.nombre ?? ''}`
              }
              placeholder="Buscar por nombre o código..."
              emptyText="Sin usuarios"
              required
            />
          ) : (
            <input
              type="text"
              value={usuarioPropioLabel}
              disabled
              className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed"
            />
          )}
        </div>

        {/* Vehículo */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">Vehículo</label>
          <SearchableSelect<VehiculoDto>
            options={vehiculosOptions}
            value={vehiculo}
            onChange={setVehiculo}
            getKey={(v) => v.id}
            getLabel={(v) => v.nombre}
            getSubLabel={(v) =>
              v.activo
                ? v.clase.toUpperCase()
                : `${v.clase.toUpperCase()} · inactivo`
            }
            getSearchText={(v) => `${v.nombre} ${v.clase}`}
            isDisabled={(v) => !v.activo}
            placeholder="Buscar por clase o nombre..."
            emptyText="Sin vehículos"
            required
          />
        </div>

        {/* Bloque kilometrajes + fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Kilometraje inicial
            </label>
            <input
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              value={kmInicial}
              onChange={(e) => setKmInicial(e.target.value)}
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Kilometraje final
            </label>
            <input
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              value={kmFinal}
              onChange={(e) => setKmFinal(e.target.value)}
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Km recorridos
            </label>
            <input
              type="text"
              value={recorrido !== null ? recorrido.toLocaleString('es-GT') : ''}
              readOnly
              tabIndex={-1}
              placeholder="—"
              className={recorridoInputClass}
            />
            {recorridoAltoAlerta && (
              <span className="text-xs text-amber-700">
                Recorrido mayor a {RECORRIDO_ALERTA_KM} km — verifica que sea
                correcto.
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Fecha y hora
            </label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Alerta informativa: km inicial vs último km final del mismo vehículo */}
        {vehiculo && !ultimaCargando && continuidadAlerta && ultima && (
          <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm">
            <strong className="font-semibold">Aviso:</strong> el último km final
            registrado para este vehículo fue{' '}
            <span className="font-mono">
              {ultima.kilometrajeFinal.toLocaleString('es-GT')}
            </span>{' '}
            ({formatFecha(ultima.fecha)}) y no coincide con el km inicial
            ingresado{' '}
            <span className="font-mono">
              {(kmIniNum ?? 0).toLocaleString('es-GT')}
            </span>
            .
          </div>
        )}

        {/* Empresas */}
        {isManager ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                Empresas movilizadas
              </label>
              <span className="text-xs text-slate-500">
                {empresaIds.length} seleccionada{empresaIds.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="border border-slate-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-slate-100">
              {empresasActivas.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">
                  No hay empresas disponibles
                </p>
              ) : (
                empresasActivas.map((e) => {
                  const checked = empresaIds.includes(e.id);
                  return (
                    <label
                      key={e.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmpresa(e.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-mono text-xs text-slate-500 w-14">
                        {e.codigo}
                      </span>
                      <span className="text-sm text-slate-800">{e.nombre}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">Empresa</label>
            {empresasInitialNoManager && empresasInitialNoManager.length > 0 ? (
              <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 flex flex-wrap gap-1">
                {empresasInitialNoManager.map((e) => (
                  <span
                    key={e.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono bg-indigo-50 text-indigo-700"
                    title={e.nombre}
                  >
                    {e.codigo} · {e.nombre}
                  </span>
                ))}
              </div>
            ) : empresaPropia ? (
              <input
                type="text"
                value={`${empresaPropia.codigo} · ${empresaPropia.nombre}`}
                disabled
                className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed"
              />
            ) : (
              <div className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-sm">
                No tienes una empresa asignada. Contacta al administrador para
                registrar movilizaciones.
              </div>
            )}
            <span className="text-xs text-slate-500">
              La empresa la asigna automáticamente el sistema según tu perfil.
            </span>
          </div>
        )}

        {/* Comentario */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">
            Comentario
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={500}
            required
            rows={3}
            className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            placeholder="Detalle del recorrido, motivo, observaciones..."
          />
          <span className="text-xs text-slate-500 self-end">
            {comentario.length}/500
          </span>
        </div>
      </form>
    </Modal>
  );
};

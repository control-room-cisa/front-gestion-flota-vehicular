import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../shared/auth/AuthContext";
import { Modal } from "../../../shared/components/Modal";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { useToast } from "../../../shared/components/ToastProvider";
import { ApiError } from "../../../shared/http/api-client";
import {
  parseIntegerInput,
  sanitizeIntegerInput,
} from "../../../shared/utils/numeric-input";
import { isMovilizacionManager } from "../../../shared/types/roles.types";
import type { ApiErrorDetail } from "../../../shared/types/api.types";
import type { EmpresaDto } from "../../empresas/types/empresa.types";
import type { UsuarioListadoDto } from "../../usuarios/types/usuario.types";
import type { UnidadDto } from "../../unidades/types/unidad.types";
import { movilizacionService } from "../services/movilizacion.service";
import type {
  CreateMovilizacionDto,
  MovilizacionDto,
  UltimaMovilizacionUnidadDto,
  UpdateMovilizacionDto,
} from "../types/movilizacion.types";

export interface MovilizacionFormProps {
  open: boolean;
  initial?: MovilizacionDto | null;
  empresas: EmpresaDto[];
  unidades: UnidadDto[];
  /**
   * Catálogo de usuarios para el selector de "dueño" del registro. Sólo se
   * usa cuando el autenticado es manager — para el resto el usuario está
   * fijo al propio.
   */
  usuarios: UsuarioListadoDto[];
  onClose: () => void;
  onSubmit: (
    data: CreateMovilizacionDto | UpdateMovilizacionDto,
  ) => Promise<void>;
}

const toLocalInput = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
};

const fromLocalInput = (local: string): string => new Date(local).toISOString();

/** Umbral en km a partir del cual mostramos la alerta de recorrido alto. */
const RECORRIDO_ALERTA_KM = 40;

const formatFecha = (iso: string): string =>
  new Date(iso).toLocaleString("es-HN", {
    dateStyle: "short",
    timeStyle: "short",
  });

type FormField =
  | "usuario"
  | "unidad"
  | "kmInicial"
  | "kmFinal"
  | "fecha"
  | "empresaIds"
  | "comentario";

type FieldErrors = Partial<Record<FormField, string>>;

/** Mapea paths del backend (Zod / negocio) a campos del formulario. */
const API_FIELD_MAP: Record<string, FormField> = {
  "data.fecha": "fecha",
  fecha: "fecha",
  "data.kilometrajeInicial": "kmInicial",
  kilometrajeInicial: "kmInicial",
  "data.kilometrajeFinal": "kmFinal",
  kilometrajeFinal: "kmFinal",
  "data.comentario": "comentario",
  comentario: "comentario",
  "data.unidadId": "unidad",
  unidadId: "unidad",
  "data.empresaIds": "empresaIds",
  empresaIds: "empresaIds",
  "data.userId": "usuario",
  userId: "usuario",
};

const mapApiErrors = (errors: ApiErrorDetail[]): FieldErrors => {
  const out: FieldErrors = {};
  for (const e of errors) {
    if (!e.field) continue;
    const key = API_FIELD_MAP[e.field];
    if (key && !out[key]) out[key] = e.message;
  }
  return out;
};

const inputClass = (hasError: boolean, extra = "") =>
  [
    "px-3 py-2 rounded-lg border outline-none",
    hasError
      ? "border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50/40"
      : "border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
    extra,
  ].join(" ");

const labelClass = (hasError: boolean) =>
  `text-sm font-semibold ${hasError ? "text-red-600" : "text-slate-700"}`;

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-xs text-red-600">{message}</p> : null;

export const MovilizacionForm = ({
  open,
  initial,
  empresas,
  unidades,
  usuarios,
  onClose,
  onSubmit,
}: MovilizacionFormProps) => {
  const { usuario } = useAuth();
  const toast = useToast();
  const editing = Boolean(initial);

  const isManager = isMovilizacionManager(usuario?.roles);

  const [fecha, setFecha] = useState("");
  const [unidad, setUnidad] = useState<UnidadDto | null>(null);
  const [usuarioSel, setUsuarioSel] = useState<UsuarioListadoDto | null>(null);
  const [kmInicial, setKmInicial] = useState("");
  const [kmFinal, setKmFinal] = useState("");
  const [comentario, setComentario] = useState("");
  const [esViaje, setEsViaje] = useState(false);
  const [empresaIds, setEmpresaIds] = useState<number[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [ultima, setUltima] = useState<UltimaMovilizacionUnidadDto | null>(
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

  const unidadesOptions = useMemo<UnidadDto[]>(() => {
    const activos = unidades.filter((v) => v.activo);
    if (initial && !activos.some((v) => v.id === initial.unidad.id)) {
      return [...activos, { ...initial.unidad, activo: false } as UnidadDto];
    }
    return activos;
  }, [unidades, initial]);

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
    setKmInicial(initial ? String(initial.kilometrajeInicial) : "");
    setKmFinal(initial ? String(initial.kilometrajeFinal) : "");
    setComentario(initial?.comentario ?? "");
    setEsViaje(initial?.esViaje ?? false);
    setFieldErrors({});
    setUltima(null);

    // Vehículo seleccionado.
    if (initial) {
      setUnidad(
        unidadesOptions.find((v) => v.id === initial.unidad.id) ?? null,
      );
    } else {
      setUnidad(null);
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
  }, [open, initial, unidadesOptions, usuariosOptions, isManager, usuario]);

  // ---------------------------------------------------------------------------
  // Al cambiar el vehículo o la fecha: cargar la movilización inmediatamente
  // anterior (la última con `fecha < fechaActual` para ese vehículo, excluyendo
  // el propio registro en edición). Antes se traía la última creada en general,
  // lo que daba alertas erróneas cuando se editaba un registro intermedio.
  //
  // Se aplica un debounce corto sobre la fecha para evitar pegarle al backend
  // en cada pulsación dentro del `datetime-local`.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    if (!unidad) {
      setUltima(null);
      return;
    }

    let cancelled = false;
    const beforeFechaISO = (() => {
      if (!fecha) return undefined;
      const d = new Date(fecha);
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
    })();

    const timer = setTimeout(() => {
      setUltimaCargando(true);
      movilizacionService
        .lastByUnidad(unidad.id, initial?.id, beforeFechaISO)
        .then((res) => {
          if (!cancelled) setUltima(res);
        })
        .catch(() => {
          if (!cancelled) setUltima(null);
        })
        .finally(() => {
          if (!cancelled) setUltimaCargando(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, unidad, fecha, initial?.id]);

  const toggleEmpresa = (id: number) => {
    clearField("empresaIds");
    setEmpresaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const clearField = (field: FormField) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const showValidationToast = (errs: FieldErrors, fallbackMessage?: string) => {
    const messages = Object.values(errs);
    if (messages.length === 0) {
      toast.warning(
        fallbackMessage ?? "Revisa el formulario.",
        "Datos inválidos",
      );
      return;
    }
    toast.warning(
      messages.length === 1
        ? messages[0]!
        : (fallbackMessage ??
            `Hay ${messages.length} campos con errores. Revisa el formulario.`),
      "Datos inválidos",
    );
  };

  const applyFieldErrors = (errs: FieldErrors, toastMessage?: string) => {
    setFieldErrors(errs);
    showValidationToast(errs, toastMessage);
  };

  const validateClient = (): FieldErrors => {
    const errs: FieldErrors = {};

    if (!unidad) errs.unidad = "Selecciona un vehículo";
    if (isManager && !usuarioSel) errs.usuario = "Selecciona un usuario";

    const kmIni = parseIntegerInput(kmInicial);
    const kmFin = parseIntegerInput(kmFinal);

    if (kmIni === null) {
      errs.kmInicial = "Ingresa un kilometraje inicial entero válido";
    }
    if (kmFin === null) {
      errs.kmFinal = "Ingresa un kilometraje final entero válido";
    }
    if (kmIni !== null && kmFin !== null && kmFin < kmIni) {
      errs.kmFinal = "El kilometraje final debe ser mayor o igual al inicial";
    }

    if (!fecha.trim()) {
      errs.fecha = "La fecha y hora son obligatorias";
    } else if (Number.isNaN(new Date(fecha).getTime())) {
      errs.fecha = "Fecha inválida";
    }

    if (isManager && empresaIds.length === 0) {
      errs.empresaIds = "Selecciona al menos una empresa";
    }
    if (noTieneEmpresa) {
      errs.empresaIds =
        "No tienes una empresa asignada. Contacta al administrador.";
    }
    if (!comentario.trim()) {
      errs.comentario = "El comentario es obligatorio";
    }

    return errs;
  };

  // No-manager: la empresa siempre es la del usuario. Se muestra como info
  // pero no entra al payload (el backend la inferirá).
  const empresaPropia = !isManager ? (usuario?.empresa ?? null) : null;
  const noTieneEmpresa = !isManager && !empresaPropia;

  // En edición + no-manager: mostramos las empresas del registro existente
  // (read-only), no la del usuario actual.
  const empresasInitialNoManager =
    !isManager && initial ? initial.empresas : null;

  // ---------------------------------------------------------------------------
  // Cálculos derivados (recorrido + alertas).
  // ---------------------------------------------------------------------------
  const kmIniNum = parseIntegerInput(kmInicial);
  const kmFinNum = parseIntegerInput(kmFinal);

  const recorrido =
    kmIniNum !== null && kmFinNum !== null && kmFinNum >= kmIniNum
      ? kmFinNum - kmIniNum
      : null;

  const recorridoAltoAlerta =
    recorrido !== null && recorrido > RECORRIDO_ALERTA_KM;

  const continuidadAlerta =
    ultima !== null &&
    kmIniNum !== null &&
    kmIniNum !== ultima.kilometrajeFinal;

  // ---------------------------------------------------------------------------
  // Submit.
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      applyFieldErrors(clientErrors);
      return;
    }

    const kmIni = parseIntegerInput(kmInicial)!;
    const kmFin = parseIntegerInput(kmFinal)!;

    setSubmitting(true);
    try {
      const payload: CreateMovilizacionDto | UpdateMovilizacionDto = {
        fecha: fromLocalInput(fecha),
        kilometrajeInicial: kmIni,
        kilometrajeFinal: kmFin,
        comentario: comentario.trim(),
        unidadId: unidad!.id,
      };
      if (isManager) {
        (payload as CreateMovilizacionDto).empresaIds = empresaIds;
        if (usuarioSel)
          (payload as CreateMovilizacionDto).userId = usuarioSel.id;
        (payload as CreateMovilizacionDto).esViaje = esViaje;
      }
      await onSubmit(payload);
    } catch (err) {
      if (err instanceof ApiError && err.errors.length > 0) {
        const mapped = mapApiErrors(err.errors);
        if (Object.keys(mapped).length > 0) {
          applyFieldErrors(mapped, err.message);
        } else {
          toast.error(err.message, "No se pudo guardar");
        }
      } else {
        toast.error(
          err instanceof Error ? err.message : "Error al guardar",
          "No se pudo guardar",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const usuarioPropioLabel = usuario
    ? `${usuario.nombre} ${usuario.apellido} (${usuario.codigo_empleado})`
    : "";

  const recorridoInputClass = [
    "px-3 py-2 rounded-lg border bg-slate-100 cursor-not-allowed font-mono",
    recorridoAltoAlerta
      ? "border-amber-400 text-amber-800"
      : "border-slate-200 text-slate-700",
  ].join(" ");

  return (
    <Modal
      open={open}
      title={editing ? "Editar movilización" : "Nueva movilización"}
      subtitle="Ingreso de kilometrajes"
      size="lg"
      busy={submitting}
      onClose={onClose}
      closeLabel="Cancelar"
      footer={
        <button
          type="submit"
          form="movilizacion-form"
          disabled={submitting || noTieneEmpresa}
          className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-70"
        >
          {submitting ? "Guardando..." : editing ? "Actualizar" : "Registrar"}
        </button>
      }
    >
      <form
        id="movilizacion-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* Usuario */}
        <div className="flex flex-col gap-1">
          <label className={labelClass(Boolean(fieldErrors.usuario))}>
            Usuario
          </label>
          {isManager ? (
            <SearchableSelect<UsuarioListadoDto>
              options={usuariosOptions}
              value={usuarioSel}
              onChange={(v) => {
                setUsuarioSel(v);
                clearField("usuario");
              }}
              getKey={(u) => u.id}
              getLabel={(u) => `${u.nombre} ${u.apellido}`}
              getSubLabel={(u) =>
                u.empresa
                  ? `${u.codigo_empleado} · ${u.empresa.codigo}`
                  : u.codigo_empleado
              }
              getSearchText={(u) =>
                `${u.nombre} ${u.apellido} ${u.codigo_empleado} ${u.empresa?.codigo ?? ""} ${u.empresa?.nombre ?? ""}`
              }
              placeholder="Buscar por nombre o código..."
              emptyText="Sin usuarios"
              required
              hasError={Boolean(fieldErrors.usuario)}
            />
          ) : (
            <input
              type="text"
              value={usuarioPropioLabel}
              disabled
              className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed"
            />
          )}
          <FieldError message={fieldErrors.usuario} />
        </div>

        {/* Vehículo */}
        <div className="flex flex-col gap-1">
          <label className={labelClass(Boolean(fieldErrors.unidad))}>
            Vehículo
          </label>
          <SearchableSelect<UnidadDto>
            options={unidadesOptions}
            value={unidad}
            onChange={(v) => {
              setUnidad(v);
              clearField("unidad");
            }}
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
            hasError={Boolean(fieldErrors.unidad)}
          />
          <FieldError message={fieldErrors.unidad} />
        </div>

        {/* Bloque kilometrajes + fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass(Boolean(fieldErrors.kmInicial))}>
              Kilometraje inicial
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={kmInicial}
              onChange={(e) => {
                setKmInicial(sanitizeIntegerInput(e.target.value));
                clearField("kmInicial");
              }}
              required
              aria-invalid={Boolean(fieldErrors.kmInicial) || undefined}
              className={inputClass(
                Boolean(fieldErrors.kmInicial),
                "font-mono",
              )}
            />
            <FieldError message={fieldErrors.kmInicial} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass(Boolean(fieldErrors.kmFinal))}>
              Kilometraje final
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={kmFinal}
              onChange={(e) => {
                setKmFinal(sanitizeIntegerInput(e.target.value));
                clearField("kmFinal");
              }}
              required
              aria-invalid={Boolean(fieldErrors.kmFinal) || undefined}
              className={inputClass(Boolean(fieldErrors.kmFinal), "font-mono")}
            />
            <FieldError message={fieldErrors.kmFinal} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Km recorridos
            </label>
            <input
              type="text"
              value={
                recorrido !== null ? recorrido.toLocaleString("es-HN") : ""
              }
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
            <label className={labelClass(Boolean(fieldErrors.fecha))}>
              Fecha y hora
            </label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                clearField("fecha");
              }}
              required
              aria-invalid={Boolean(fieldErrors.fecha) || undefined}
              className={inputClass(Boolean(fieldErrors.fecha))}
            />
            <FieldError message={fieldErrors.fecha} />
          </div>
        </div>

        {/* Alerta informativa: km inicial vs último km final del mismo vehículo */}
        {unidad && !ultimaCargando && continuidadAlerta && ultima && (
          <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm">
            <strong className="font-semibold">Aviso:</strong> el último km final
            registrado para este vehículo fue{" "}
            <span className="font-mono">
              {ultima.kilometrajeFinal.toLocaleString("es-HN")}
            </span>{" "}
            ({formatFecha(ultima.fecha)}) y no coincide con el km inicial
            ingresado{" "}
            <span className="font-mono">
              {(kmIniNum ?? 0).toLocaleString("es-HN")}
            </span>
            .
          </div>
        )}

        {/* Empresas */}
        {isManager ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className={labelClass(Boolean(fieldErrors.empresaIds))}>
                Empresas movilizadas
              </label>
              <span className="text-xs text-slate-500">
                {empresaIds.length} seleccionada
                {empresaIds.length === 1 ? "" : "s"}
              </span>
            </div>
            <div
              className={
                "border rounded-lg max-h-44 overflow-y-auto divide-y divide-slate-100 " +
                (fieldErrors.empresaIds
                  ? "border-red-400 bg-red-50/40"
                  : "border-slate-200")
              }
            >
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
                      <span className="text-sm text-slate-800">{e.nombre}</span>
                      <span className="text-xs text-slate-500 font-mono ml-auto">
                        {e.codigo}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <FieldError message={fieldErrors.empresaIds} />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className={labelClass(Boolean(fieldErrors.empresaIds))}>
              Empresa
            </label>
            {empresasInitialNoManager && empresasInitialNoManager.length > 0 ? (
              <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 flex flex-wrap gap-1">
                {empresasInitialNoManager.map((e) => (
                  <span
                    key={e.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700"
                    title={e.codigo}
                  >
                    {e.nombre}
                  </span>
                ))}
              </div>
            ) : empresaPropia ? (
              <input
                type="text"
                value={empresaPropia.nombre}
                disabled
                className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed"
              />
            ) : (
              <div className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-sm">
                No tienes una empresa asignada. Contacta al administrador para
                registrar movilizaciones.
              </div>
            )}
            <FieldError message={fieldErrors.empresaIds} />
            <span className="text-xs text-slate-500">
              La empresa la asigna automáticamente el sistema según tu perfil.
            </span>
          </div>
        )}

        {isManager && (
          <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
            <input
              type="checkbox"
              checked={esViaje}
              onChange={(e) => setEsViaje(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-800">
              <span className="font-semibold">Es viaje</span>
              <span className="block text-xs text-slate-500">
                Marca esta movilización como un viaje.
              </span>
            </span>
          </label>
        )}

        {/* Comentario */}
        <div className="flex flex-col gap-1">
          <label className={labelClass(Boolean(fieldErrors.comentario))}>
            Comentario
          </label>
          <textarea
            value={comentario}
            onChange={(e) => {
              setComentario(e.target.value);
              clearField("comentario");
            }}
            maxLength={500}
            required
            rows={3}
            aria-invalid={Boolean(fieldErrors.comentario) || undefined}
            className={inputClass(
              Boolean(fieldErrors.comentario),
              "resize-none",
            )}
            placeholder="Detalle del recorrido, motivo, observaciones..."
          />
          <FieldError message={fieldErrors.comentario} />
          <span className="text-xs text-slate-500 self-end">
            {comentario.length}/500
          </span>
        </div>
      </form>
    </Modal>
  );
};

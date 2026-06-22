import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../shared/auth/AuthContext';
import { Modal } from '../../../shared/components/Modal';
import { SearchableSelect } from '../../../shared/components/SearchableSelect';
import { isConstruccionManager } from '../../../shared/types/roles.types';
import {
  parseIntegerInput,
  sanitizeIntegerInput,
} from '../../../shared/utils/numeric-input';
import type { EmpresaDto } from '../../empresas/types/empresa.types';
import type { UsuarioListadoDto } from '../../usuarios/types/usuario.types';
import type { UnidadDto } from '../../unidades/types/unidad.types';
import type {
  CreateRegistroConstruccionDto,
  RegistroConstruccionDto,
  UpdateRegistroConstruccionDto,
} from '../types/registro-construccion.types';
import {
  unidadUsaHorometro,
  unidadUsaKilometraje,
} from '../utils/maquinaria-unidades.utils';

export interface RegistroConstruccionFormProps {
  open: boolean;
  initial?: RegistroConstruccionDto | null;
  empresas: EmpresaDto[];
  unidades: UnidadDto[];
  usuarios: UsuarioListadoDto[];
  onClose: () => void;
  onSubmit: (
    data: CreateRegistroConstruccionDto | UpdateRegistroConstruccionDto,
  ) => Promise<void>;
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

const parseOptionalInt = (raw: string): number | null => {
  const t = raw.trim();
  if (!t) return null;
  return parseIntegerInput(t);
};

export const RegistroConstruccionForm = ({
  open,
  initial,
  empresas,
  unidades,
  usuarios,
  onClose,
  onSubmit,
}: RegistroConstruccionFormProps) => {
  const { usuario } = useAuth();
  const editing = Boolean(initial);
  const isManager = isConstruccionManager(usuario?.roles);

  const [fecha, setFecha] = useState('');
  const [unidad, setUnidad] = useState<UnidadDto | null>(null);
  const [operador, setOperador] = useState<UsuarioListadoDto | null>(null);
  const [kmInicial, setKmInicial] = useState('');
  const [kmFinal, setKmFinal] = useState('');
  const [hInicial, setHInicial] = useState('');
  const [hFinal, setHFinal] = useState('');
  const [comentario, setComentario] = useState('');
  const [empresaIds, setEmpresaIds] = useState<number[]>([]);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const empresasActivas = useMemo(
    () => empresas.filter((e) => e.activo),
    [empresas],
  );

  const unidadesOptions = useMemo(() => {
    const activos = unidades.filter((u) => u.activo);
    if (!initial) return activos;
    const full = unidades.find((u) => u.id === initial.unidad.id);
    if (full && !activos.some((u) => u.id === full.id)) {
      return [...activos, { ...full, activo: false }];
    }
    return activos;
  }, [unidades, initial]);

  const usuariosOptions = useMemo(() => {
    if (!initial) return usuarios;
    if (usuarios.some((u) => u.id === initial.operador.id)) return usuarios;
    return [
      ...usuarios,
      {
        id: initial.operador.id,
        codigo_empleado: initial.operador.codigo_empleado,
        nombre: initial.operador.nombre,
        apellido: initial.operador.apellido,
        empresa: null,
      },
    ];
  }, [usuarios, initial]);

  useEffect(() => {
    if (!open) return;
    setFecha(toLocalInput(initial?.fecha));
    setKmInicial(
      initial?.kilometrajeInicial != null
        ? String(initial.kilometrajeInicial)
        : '',
    );
    setKmFinal(
      initial?.kilometrajeFinal != null ? String(initial.kilometrajeFinal) : '',
    );
    setHInicial(
      initial?.horaInicial != null ? String(initial.horaInicial) : '',
    );
    setHFinal(initial?.horaFinal != null ? String(initial.horaFinal) : '');
    setComentario(initial?.comentario ?? '');
    setError(undefined);

    if (initial) {
      setUnidad(
        unidadesOptions.find((u) => u.id === initial.unidad.id) ?? null,
      );
      setOperador(
        usuariosOptions.find((u) => u.id === initial.operador.id) ?? null,
      );
      setEmpresaIds(initial.empresas.map((e) => e.id));
    } else {
      setUnidad(null);
      setOperador(null);
      setEmpresaIds([]);
    }
  }, [open, initial, unidadesOptions, usuariosOptions]);

  const usaKm = unidadUsaKilometraje(unidad);
  const usaHoras = unidadUsaHorometro(unidad);

  useEffect(() => {
    if (!unidad) return;
    if (usaKm) {
      setHInicial('');
      setHFinal('');
    } else if (usaHoras) {
      setKmInicial('');
      setKmFinal('');
    }
  }, [unidad?.id, usaKm, usaHoras]);

  const toggleEmpresa = (id: number) => {
    setEmpresaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    if (!unidad) {
      setError('Selecciona una unidad');
      return;
    }

    if (usaHoras) {
      const hi = parseOptionalInt(hInicial);
      const hf = parseOptionalInt(hFinal);
      if (hi !== null && hf !== null && hf <= hi) {
        setError('El horómetro final debe ser mayor al inicial');
        return;
      }
    }

    const payload: CreateRegistroConstruccionDto = {
      fecha: fromLocalInput(fecha),
      kilometrajeInicial: usaKm ? parseOptionalInt(kmInicial) : null,
      kilometrajeFinal: usaKm ? parseOptionalInt(kmFinal) : null,
      horaInicial: usaHoras ? parseOptionalInt(hInicial) : null,
      horaFinal: usaHoras ? parseOptionalInt(hFinal) : null,
      comentario: comentario.trim(),
      unidadId: unidad.id,
      empresaIds: isManager ? empresaIds : [],
    };

    if (isManager && operador) {
      payload.operadorId = operador.id;
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const kmIniNum = parseOptionalInt(kmInicial);
  const kmFinNum = parseOptionalInt(kmFinal);
  const hIniNum = parseOptionalInt(hInicial);
  const hFinNum = parseOptionalInt(hFinal);

  return (
    <Modal
      open={open}
      title={editing ? 'Editar registro' : 'Nuevo registro'}
      subtitle="Uso maquinaria"
      size="lg"
      busy={submitting}
      onClose={onClose}
      closeLabel="Cancelar"
      footer={
        <button
          type="submit"
          form="registro-construccion-form"
          disabled={
            submitting ||
            (usaHoras &&
              hIniNum !== null &&
              hFinNum !== null &&
              hFinNum <= hIniNum)
          }
          className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-70"
        >
          {submitting ? 'Guardando...' : editing ? 'Actualizar' : 'Registrar'}
        </button>
      }
    >
      <form
        id="registro-construccion-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">Fecha</label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">Unidad</label>
            <SearchableSelect<UnidadDto>
              options={unidadesOptions}
              value={unidad}
              onChange={setUnidad}
              getKey={(u) => u.id}
              getLabel={(u) => u.nombre}
              getSubLabel={(u) => u.clase.toUpperCase()}
              getSearchText={(u) => `${u.nombre} ${u.clase}`}
              placeholder="Seleccionar unidad..."
              required
            />
          </div>
        </div>

        {isManager && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">Operador</label>
            <SearchableSelect<UsuarioListadoDto>
              options={usuariosOptions}
              value={operador}
              onChange={setOperador}
              getKey={(u) => u.id}
              getLabel={(u) => `${u.nombre} ${u.apellido}`.trim()}
              getSubLabel={(u) => u.codigo_empleado}
              getSearchText={(u) =>
                `${u.nombre} ${u.apellido} ${u.codigo_empleado}`
              }
              placeholder="Seleccionar operador..."
              required
            />
          </div>
        )}

        {unidad && usaKm && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Km inicial</label>
              <input
                type="text"
                inputMode="numeric"
                value={kmInicial}
                onChange={(e) => setKmInicial(sanitizeIntegerInput(e.target.value))}
                required
                className="px-3 py-2 rounded-lg border border-slate-200 font-mono outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Km final</label>
              <input
                type="text"
                inputMode="numeric"
                value={kmFinal}
                onChange={(e) => setKmFinal(sanitizeIntegerInput(e.target.value))}
                required
                className="px-3 py-2 rounded-lg border border-slate-200 font-mono outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {unidad && usaHoras && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">H. inicial</label>
              <input
                type="text"
                inputMode="numeric"
                value={hInicial}
                onChange={(e) => setHInicial(sanitizeIntegerInput(e.target.value))}
                required
                className="px-3 py-2 rounded-lg border border-slate-200 font-mono outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">H. final</label>
              <input
                type="text"
                inputMode="numeric"
                value={hFinal}
                onChange={(e) => setHFinal(sanitizeIntegerInput(e.target.value))}
                required
                className="px-3 py-2 rounded-lg border border-slate-200 font-mono outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {usaKm && kmIniNum !== null && kmFinNum !== null && (
          <div className="text-xs text-slate-500">
            Km recorridos: {(kmFinNum - kmIniNum).toLocaleString('es-GT')}
          </div>
        )}

        {usaHoras && hIniNum !== null && hFinNum !== null && (
          <div
            className={
              hFinNum <= hIniNum ? 'text-xs text-red-600' : 'text-xs text-slate-500'
            }
          >
            {hFinNum <= hIniNum
              ? 'El horómetro final debe ser mayor al inicial'
              : `Horas de uso: ${(hFinNum - hIniNum).toLocaleString('es-GT')}`}
          </div>
        )}

        {isManager && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Empresas
            </label>
            <div className="border rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100 border-slate-200">
              {empresasActivas.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">Sin empresas</p>
              ) : (
                empresasActivas.map((e) => (
                  <label
                    key={e.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={empresaIds.includes(e.id)}
                      onChange={() => toggleEmpresa(e.id)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-800">{e.nombre}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">Comentario</label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            maxLength={500}
            required
            className="px-3 py-2 rounded-lg border border-slate-200 resize-y outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </form>
    </Modal>
  );
};

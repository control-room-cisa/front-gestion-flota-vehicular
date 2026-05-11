import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { ROLES, type RolNombre } from '../../../shared/types/roles.types';
import type {
  UpdateUsuarioRolesDto,
  UsuarioAdminDto,
} from '../types/usuario.types';

interface UsuarioRolesFormProps {
  open: boolean;
  usuario: UsuarioAdminDto | null;
  onCancel: () => void;
  onSubmit: (data: UpdateUsuarioRolesDto) => Promise<void>;
}

const ROL_LABEL: Record<RolNombre, string> = {
  usuario: 'Usuario',
  controlroom: 'Sala de control',
  logistica: 'Logística',
  contabilidad: 'Contabilidad',
  almacen: 'Almacén',
  admin: 'Administrador',
};

const ROL_DESCRIPCION: Record<RolNombre, string> = {
  usuario: 'Acceso básico: registrar sus propias movilizaciones.',
  controlroom: 'Supervisión de movilizaciones y monitoreo de flota.',
  logistica: 'Gestión completa de vehículos y movilizaciones.',
  contabilidad: 'Gestión de empresas y reportes financieros.',
  almacen: 'Registro de dispensados de combustible.',
  admin: 'Acceso total al sistema, incluyendo administración de usuarios.',
};

/**
 * Modal de edición de roles del usuario.
 * Toda la información del usuario es de **solo lectura**; únicamente
 * se permite modificar el conjunto de roles asignados.
 */
export const UsuarioRolesForm = ({
  open,
  usuario,
  onCancel,
  onSubmit,
}: UsuarioRolesFormProps) => {
  const [seleccionados, setSeleccionados] = useState<Set<RolNombre>>(new Set());
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && usuario) {
      setSeleccionados(new Set(usuario.roles));
      setError(undefined);
      setSubmitting(false);
    }
  }, [open, usuario]);

  const original = useMemo(
    () => (usuario ? new Set(usuario.roles) : new Set<RolNombre>()),
    [usuario],
  );

  const dirty = useMemo(() => {
    if (seleccionados.size !== original.size) return true;
    for (const r of seleccionados) if (!original.has(r)) return true;
    return false;
  }, [seleccionados, original]);

  const toggle = (rol: RolNombre) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(rol)) next.delete(rol);
      else next.add(rol);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario) return;
    setError(undefined);
    if (seleccionados.size === 0) {
      setError('Debes asignar al menos un rol.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ roles: Array.from(seleccionados) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  if (!usuario) return null;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      busy={submitting}
      size="lg"
      subtitle="Administración"
      title={`Editar roles — ${usuario.nombre} ${usuario.apellido}`}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="usuario-roles-form"
            disabled={submitting || !dirty}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60"
          >
            {submitting ? 'Guardando...' : 'Guardar roles'}
          </button>
        </>
      }
    >
      <form id="usuario-roles-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Información de solo lectura */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <ReadOnly label="Código de empleado" value={usuario.codigo_empleado} mono />
          <ReadOnly
            label="Nombre completo"
            value={`${usuario.nombre} ${usuario.apellido}`}
          />
          <ReadOnly
            label="Nombre de usuario"
            value={usuario.nombre_usuario ?? '—'}
            mono
          />
          <ReadOnly
            label="Correo electrónico"
            value={usuario.correo_electronico ?? '—'}
          />
          <ReadOnly
            label="Empresa"
            value={
              usuario.empresa
                ? `${usuario.empresa.codigo} — ${usuario.empresa.nombre}`
                : '—'
            }
            className="sm:col-span-2"
          />
        </section>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Selección de roles */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-800">Roles asignados</h3>
            <span className="text-xs text-slate-500">
              {seleccionados.size} de {ROLES.length} seleccionados
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ROLES.map((rol) => {
              const activo = seleccionados.has(rol);
              return (
                <label
                  key={rol}
                  className={
                    'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ' +
                    (activo
                      ? 'border-indigo-300 bg-indigo-50/60'
                      : 'border-slate-200 hover:bg-slate-50')
                  }
                >
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={() => toggle(rol)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800">
                      {ROL_LABEL[rol]}
                    </span>
                    <span className="text-xs text-slate-500">
                      {ROL_DESCRIPCION[rol]}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </section>
      </form>
    </Modal>
  );
};

interface ReadOnlyProps {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}

const ReadOnly = ({ label, value, mono, className = '' }: ReadOnlyProps) => (
  <div className={`flex flex-col ${className}`}>
    <span className="text-xs uppercase tracking-wider text-slate-500">
      {label}
    </span>
    <span
      className={
        'text-sm text-slate-800 ' + (mono ? 'font-mono' : 'font-medium')
      }
    >
      {value}
    </span>
  </div>
);

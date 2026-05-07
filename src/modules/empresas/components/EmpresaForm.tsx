import { useEffect, useState } from 'react';
import type {
  CreateEmpresaDto,
  EmpresaDto,
  UpdateEmpresaDto,
} from '../types/empresa.types';

interface EmpresaFormProps {
  initial?: EmpresaDto | null;
  onCancel: () => void;
  onSubmit: (data: CreateEmpresaDto | UpdateEmpresaDto) => Promise<void>;
}

export const EmpresaForm = ({ initial, onCancel, onSubmit }: EmpresaFormProps) => {
  const editing = Boolean(initial);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCodigo(initial?.codigo ?? '');
    setNombre(initial?.nombre ?? '');
    setError(undefined);
  }, [initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      await onSubmit({ codigo: codigo.trim(), nombre: nombre.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
    >
      <h2 className="text-lg font-bold text-slate-800">
        {editing ? `Editar ${initial?.codigo}` : 'Nueva empresa'}
      </h2>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">Código</label>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            maxLength={5}
            required
            className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="EMP"
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-sm font-semibold text-slate-700">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={30}
            required
            className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Razón social"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-70"
        >
          {submitting ? 'Guardando...' : editing ? 'Actualizar' : 'Crear empresa'}
        </button>
      </div>
    </form>
  );
};

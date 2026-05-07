import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/http/api-client';
import { AppHeader } from '../../../shared/components/AppHeader';
import { useConfirm } from '../../../shared/components/ConfirmProvider';
import { EmpresaForm } from '../components/EmpresaForm';
import { empresaService } from '../services/empresa.service';
import type {
  CreateEmpresaDto,
  EmpresaDto,
  UpdateEmpresaDto,
} from '../types/empresa.types';

type Modo =
  | { tipo: 'oculto' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; empresa: EmpresaDto };

export const EmpresasPage = () => {
  const confirm = useConfirm();
  const [empresas, setEmpresas] = useState<EmpresaDto[]>([]);
  const [incluirInactivas, setIncluirInactivas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [modo, setModo] = useState<Modo>({ tipo: 'oculto' });

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const list = await empresaService.list(incluirInactivas);
      setEmpresas(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  }, [incluirInactivas]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSubmit = async (data: CreateEmpresaDto | UpdateEmpresaDto) => {
    if (modo.tipo === 'crear') {
      await empresaService.create(data as CreateEmpresaDto);
    } else if (modo.tipo === 'editar') {
      await empresaService.update(modo.empresa.id, data);
    }
    setModo({ tipo: 'oculto' });
    await cargar();
  };

  const toggleActivo = async (empresa: EmpresaDto) => {
    const accion = empresa.activo ? 'inactivar' : 'reactivar';
    const ok = await confirm({
      title: empresa.activo ? 'Inactivar empresa' : 'Reactivar empresa',
      message: `¿Seguro que deseas ${accion} la empresa ${empresa.codigo}?`,
      confirmText: empresa.activo ? 'Inactivar' : 'Reactivar',
      variant: empresa.activo ? 'warning' : 'info',
    });
    if (!ok) return;
    try {
      await empresaService.setActivo(empresa.id, !empresa.activo);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo actualizar la empresa';
      window.alert(msg);
    }
  };

  const eliminar = async (empresa: EmpresaDto) => {
    const ok = await confirm({
      title: 'Eliminar empresa',
      message: `¿Eliminar la empresa ${empresa.codigo}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await empresaService.remove(empresa.id);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo eliminar la empresa';
      window.alert(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader title="Empresas" subtitle="Contabilidad" />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={incluirInactivas}
              onChange={(e) => setIncluirInactivas(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Mostrar empresas inactivas
          </label>

          {modo.tipo === 'oculto' && (
            <button
              type="button"
              onClick={() => setModo({ tipo: 'crear' })}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
            >
              + Nueva empresa
            </button>
          )}
        </div>

        {modo.tipo !== 'oculto' && (
          <EmpresaForm
            initial={modo.tipo === 'editar' ? modo.empresa : null}
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
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Código</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Cargando...</td></tr>
              ) : empresas.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Sin registros</td></tr>
              ) : (
                empresas.map((e) => (
                  <tr key={e.id} className={e.activo ? '' : 'bg-slate-50/60'}>
                    <td className="px-4 py-3 font-mono text-sm text-slate-800">{e.codigo}</td>
                    <td className="px-4 py-3 text-sm text-slate-800">{e.nombre}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ' +
                          (e.activo
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600')
                        }
                      >
                        {e.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setModo({ tipo: 'editar', empresa: e })}
                        className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActivo(e)}
                        className={
                          'px-3 py-1 text-xs font-semibold rounded-lg border ' +
                          (e.activo
                            ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50')
                        }
                      >
                        {e.activo ? 'Inactivar' : 'Reactivar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminar(e)}
                        className="px-3 py-1 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

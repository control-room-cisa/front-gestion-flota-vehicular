import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/http/api-client';
import { AppHeader } from '../../../shared/components/AppHeader';
import { useConfirm } from '../../../shared/components/ConfirmProvider';
import { VehiculoForm } from '../components/VehiculoForm';
import { vehiculoService } from '../services/vehiculo.service';
import type {
  CreateVehiculoDto,
  UpdateVehiculoDto,
  VehiculoDto,
} from '../types/vehiculo.types';

type Modo =
  | { tipo: 'oculto' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; vehiculo: VehiculoDto };

export const VehiculosPage = () => {
  const confirm = useConfirm();
  const [vehiculos, setVehiculos] = useState<VehiculoDto[]>([]);
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [modo, setModo] = useState<Modo>({ tipo: 'oculto' });

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const list = await vehiculoService.list(incluirInactivos);
      setVehiculos(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar vehículos');
    } finally {
      setLoading(false);
    }
  }, [incluirInactivos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSubmit = async (data: CreateVehiculoDto | UpdateVehiculoDto) => {
    if (modo.tipo === 'crear') {
      await vehiculoService.create(data as CreateVehiculoDto);
    } else if (modo.tipo === 'editar') {
      await vehiculoService.update(modo.vehiculo.id, data);
    }
    setModo({ tipo: 'oculto' });
    await cargar();
  };

  const toggleActivo = async (vehiculo: VehiculoDto) => {
    const accion = vehiculo.activo ? 'inactivar' : 'reactivar';
    const ok = await confirm({
      title: vehiculo.activo ? 'Inactivar vehículo' : 'Reactivar vehículo',
      message: `¿Seguro que deseas ${accion} el vehículo ${vehiculo.clase}?`,
      confirmText: vehiculo.activo ? 'Inactivar' : 'Reactivar',
      variant: vehiculo.activo ? 'warning' : 'info',
    });
    if (!ok) return;
    try {
      await vehiculoService.setActivo(vehiculo.id, !vehiculo.activo);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo actualizar el vehículo';
      window.alert(msg);
    }
  };

  const eliminar = async (vehiculo: VehiculoDto) => {
    const ok = await confirm({
      title: 'Eliminar vehículo',
      message: `¿Eliminar el vehículo ${vehiculo.clase}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await vehiculoService.remove(vehiculo.id);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo eliminar el vehículo';
      window.alert(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader title="Vehículos" subtitle="Logística" />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={incluirInactivos}
              onChange={(e) => setIncluirInactivos(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Mostrar vehículos inactivos
          </label>

          {modo.tipo === 'oculto' && (
            <button
              type="button"
              onClick={() => setModo({ tipo: 'crear' })}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
            >
              + Nuevo vehículo
            </button>
          )}
        </div>

        {modo.tipo !== 'oculto' && (
          <VehiculoForm
            initial={modo.tipo === 'editar' ? modo.vehiculo : null}
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
              ) : vehiculos.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Sin registros</td></tr>
              ) : (
                vehiculos.map((v) => (
                  <tr key={v.id} className={v.activo ? '' : 'bg-slate-50/60'}>
                    <td className="px-4 py-3 font-mono text-sm text-slate-800">{v.clase}</td>
                    <td className="px-4 py-3 text-sm text-slate-800">{v.nombre}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ' +
                          (v.activo
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600')
                        }
                      >
                        {v.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setModo({ tipo: 'editar', vehiculo: v })}
                        className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActivo(v)}
                        className={
                          'px-3 py-1 text-xs font-semibold rounded-lg border ' +
                          (v.activo
                            ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50')
                        }
                      >
                        {v.activo ? 'Inactivar' : 'Reactivar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminar(v)}
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

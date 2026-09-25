'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Plus, Trash2, CheckCircle2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDimension, formatWeight } from '@/lib/utils';
import type { VehicleDto, VehicleType } from '@cargoflow/shared-types';

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<VehicleType>('SEMI_TRAILER');
  const [interiorLength, setInteriorLength] = useState(13600);
  const [interiorWidth, setInteriorWidth] = useState(2450);
  const [interiorHeight, setInteriorHeight] = useState(2700);
  const [maxPayloadKg, setMaxPayloadKg] = useState(24000);
  const [doorWidth, setDoorWidth] = useState(2400);
  const [doorHeight, setDoorHeight] = useState(2600);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<VehicleDto[]>('/vehicles'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/vehicles', {
        name,
        type,
        interiorLength: Number(interiorLength),
        interiorWidth: Number(interiorWidth),
        interiorHeight: Number(interiorHeight),
        maxPayloadKg: Number(maxPayloadKg),
        doorWidth: Number(doorWidth),
        doorHeight: Number(doorHeight),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsModalOpen(false);
      setName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vehicles & Trailers</h1>
          <p className="mt-1 text-xs text-slate-500">Configure trailer models, interior loading volumes, and payload weight limits</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-apple-sm transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Add Trailer Type</span>
        </button>
      </div>

      {/* Grid of Vehicles */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">Loading fleet models...</div>
        ) : vehicles.map((v) => (
          <div key={v.id} className="relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-apple-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{v.name}</h3>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{v.type}</span>
                </div>
              </div>

              <button
                onClick={() => deleteMutation.mutate(v.id)}
                className="text-slate-300 hover:text-red-500 transition"
                title="Remove trailer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
              <div>
                <span className="text-[10px] font-medium text-slate-400">Interior (L × W × H)</span>
                <p className="text-xs font-semibold text-slate-800">
                  {formatDimension(v.interiorLength)} × {formatDimension(v.interiorWidth)} × {formatDimension(v.interiorHeight)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400">Max Payload</span>
                <p className="text-xs font-semibold text-slate-800">{formatWeight(v.maxPayloadKg)}</p>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400">Door Clearance</span>
                <p className="text-xs font-semibold text-slate-800">
                  {formatDimension(v.doorWidth)} × {formatDimension(v.doorHeight)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400">Volume</span>
                <p className="text-xs font-semibold text-slate-800">
                  {((v.interiorLength * v.interiorWidth * v.interiorHeight) / 1e9).toFixed(1)} m³
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-apple-lg border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Add Vehicle / Trailer</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700">Vehicle Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 53ft High Cube Container"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-medium text-slate-700">Length (mm)</label>
                  <input
                    type="number"
                    value={interiorLength}
                    onChange={(e) => setInteriorLength(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Width (mm)</label>
                  <input
                    type="number"
                    value={interiorWidth}
                    onChange={(e) => setInteriorWidth(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Height (mm)</label>
                  <input
                    type="number"
                    value={interiorHeight}
                    onChange={(e) => setInteriorHeight(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-medium text-slate-700">Max Payload (kg)</label>
                  <input
                    type="number"
                    value={maxPayloadKg}
                    onChange={(e) => setMaxPayloadKg(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Door Width (mm)</label>
                  <input
                    type="number"
                    value={doorWidth}
                    onChange={(e) => setDoorWidth(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Door Height (mm)</label>
                  <input
                    type="number"
                    value={doorHeight}
                    onChange={(e) => setDoorHeight(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!name}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Create Trailer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


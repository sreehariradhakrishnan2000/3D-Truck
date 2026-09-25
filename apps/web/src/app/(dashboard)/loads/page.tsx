'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Layers, Plus, Truck, ArrowRight, CheckCircle2, Clock, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatWeight } from '@/lib/utils';
import type { LoadDto, VehicleDto } from '@cargoflow/shared-types';

export default function LoadsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['loads'],
    queryFn: () => api.get<LoadDto[]>('/loads'),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<VehicleDto[]>('/vehicles'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<LoadDto>('/loads', {
        vehicleId,
        origin: origin || undefined,
        destination: destination || undefined,
        notes: notes || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      setIsModalOpen(false);
      setOrigin('');
      setDestination('');
      setNotes('');
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Load Plans</h1>
          <p className="mt-1 text-xs text-slate-500">Plan, validate, and optimize 3D cargo arrangements inside trailers</p>
        </div>
        <button
          onClick={() => {
            if (vehicles.length > 0 && !vehicleId) setVehicleId(vehicles[0].id);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-apple-sm transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>New Load Plan</span>
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white shadow-apple-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading load plans...</div>
        ) : loads.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-medium text-slate-600">No load plans yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {loads.map((load) => (
              <div
                key={load.id}
                className="flex items-center justify-between p-5 transition hover:bg-slate-50/80"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{load.loadNumber}</span>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        {load.status}
                      </span>
                      {load.validationPassed && (
                        <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Validated
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {load.vehicle?.name || 'Trailer'} • {load.origin || 'Origin'} → {load.destination || 'Destination'} • {load.packageCount} cargo items
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-800">
                      {load.volumeUtilizationPct.toFixed(1)}% Vol • {formatWeight(load.totalWeightKg)}
                    </div>
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${Math.min(100, load.volumeUtilizationPct)}%` }}
                      />
                    </div>
                  </div>

                  <Link
                    href={`/loads/${load.id}`}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-blue-600 hover:text-white transition shadow-apple-sm"
                  >
                    <span>Open 3D Planner</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-apple-lg border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Create Load Plan</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700">Assign Vehicle / Trailer</label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:outline-none focus:border-blue-600"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({formatWeight(v.maxPayloadKg)} max)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700">Origin Facility</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Frankfurt Distribution Hub"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700">Destination Delivery Point</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Rotterdam Port Logistics Center"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700">Planning Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional loading instructions..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!vehicleId}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Create Load
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


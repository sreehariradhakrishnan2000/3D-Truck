'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Plus, Search, Trash2, AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDimension, formatWeight } from '@/lib/utils';
import type { PackageDefinitionDto } from '@cargoflow/shared-types';

export default function PackageDefinitionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New package form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [length, setLength] = useState(1200);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(1000);
  const [weightKg, setWeightKg] = useState(300);
  const [isStackable, setIsStackable] = useState(true);
  const [isFragile, setIsFragile] = useState(false);
  const [requiresUpright, setRequiresUpright] = useState(false);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['package-definitions', search],
    queryFn: () =>
      api.get<PackageDefinitionDto[]>(
        `/package-definitions${search ? `?search=${encodeURIComponent(search)}` : ''}`
      ),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/package-definitions', {
        name,
        sku: sku || undefined,
        length: Number(length),
        width: Number(width),
        height: Number(height),
        weightKg: Number(weightKg),
        isStackable,
        isFragile,
        requiresUprightOrientation: requiresUpright,
        allowedRotations: requiresUpright ? [0, 2] : [0, 1, 2, 3, 4, 5],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-definitions'] });
      setIsModalOpen(false);
      setName('');
      setSku('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/package-definitions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-definitions'] });
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Package Catalog</h1>
          <p className="mt-1 text-xs text-slate-500">Standardized cargo items, pallet definitions, and stacking constraints</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-apple-sm transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Define Cargo Item</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU or number..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 shadow-apple-sm focus:border-blue-600 focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">Loading cargo catalog...</div>
        ) : packages.map((pkg) => (
          <div key={pkg.id} className="relative rounded-2xl border border-slate-200/80 bg-white p-4 shadow-apple-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{pkg.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">{pkg.sku || pkg.packageNumber}</span>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(pkg.id)}
                  className="text-slate-300 hover:text-red-500 transition"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span className="text-slate-400">Dimensions:</span>
                  <span className="font-medium">{formatDimension(pkg.length)} × {formatDimension(pkg.width)} × {formatDimension(pkg.height)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="text-slate-400">Weight:</span>
                  <span className="font-semibold text-slate-800">{formatWeight(pkg.weightKg)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1 border-t border-slate-100 pt-3">
              {pkg.isStackable ? (
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                  Stackable
                </span>
              ) : (
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                  Non-Stackable
                </span>
              )}

              {pkg.isFragile && (
                <span className="flex items-center gap-0.5 rounded-md bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Fragile
                </span>
              )}

              {pkg.requiresUprightOrientation && (
                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">
                  Upright
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-apple-lg border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Add Cargo Definition</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700">Item Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard Euro Pallet"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700">SKU / Code</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="PLT-EUR-01"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-medium text-slate-700">Length (mm)</label>
                  <input
                    type="number"
                    value={length}
                    onChange={(e) => setLength(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Width (mm)</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Height (mm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700">Unit Weight (kg)</label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isStackable}
                    onChange={(e) => setIsStackable(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">Stackable cargo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFragile}
                    onChange={(e) => setIsFragile(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">Fragile (do not stack cargo on top)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresUpright}
                    onChange={(e) => setRequiresUpright(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">Requires upright orientation only</span>
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!name}
                className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


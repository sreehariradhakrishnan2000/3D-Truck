'use client';

import { useState } from 'react';
import { Box, Plus, Check, ArrowRight, X } from 'lucide-react';
import { usePlannerStore } from '@/store/plannerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatDimension, formatWeight } from '@/lib/units';
import type { LoadPackageDto, PackageDefinitionDto } from '@cargoflow/shared-types';

interface CargoTrayProps {
  loadPackages: LoadPackageDto[];
  packageDefinitions: PackageDefinitionDto[];
  onAddPackage: (packageDefinitionId: string, quantity: number) => void;
  onPlacePackage: (loadPackageId: string) => void;
}

export function CargoTray({
  loadPackages,
  packageDefinitions,
  onAddPackage,
  onPlacePackage,
}: CargoTrayProps) {
  const { unitSystem } = useSettingsStore();
  const {
    placements,
    selectedLoadPackageId,
    setSelectedLoadPackageId,
  } = usePlannerStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDefId, setSelectedDefId] = useState('');
  const [quantity, setQuantity] = useState(1);

  const pendingPackages = loadPackages.filter(
    (lp) => !placements.has(lp.id) && (!lp.placements || lp.placements.length === 0)
  );

  const placedPackages = loadPackages.filter(
    (lp) => placements.has(lp.id) || (lp.placements && lp.placements.length > 0)
  );

  return (
    <aside className="w-80 flex-shrink-0 border-r border-slate-200/80 bg-white flex flex-col h-full z-10">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Cargo Manifest</h2>
          <span className="text-[10px] text-slate-500">
            {placedPackages.length} placed • {pendingPackages.length} pending
          </span>
        </div>
        <button
          onClick={() => {
            if (packageDefinitions.length > 0 && !selectedDefId) {
              setSelectedDefId(packageDefinitions[0].id);
            }
            setIsAddModalOpen(true);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
          title="Add cargo items to load"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Package Lists */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Pending (To Load) */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
            Pending Placement ({pendingPackages.length})
          </span>
          <div className="mt-2 space-y-2">
            {pendingPackages.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-1">All cargo packages have been placed!</p>
            ) : (
              pendingPackages.map((lp) => (
                <div
                  key={lp.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 flex items-center justify-between text-xs hover:border-slate-300 transition"
                >
                  <div>
                    <h4 className="font-semibold text-slate-800">{lp.packageDefinition?.name}</h4>
                    <p className="text-[10px] text-slate-500">
                      {formatDimension(lp.packageDefinition?.length || 0, unitSystem)} × {formatDimension(lp.packageDefinition?.width || 0, unitSystem)} × {formatDimension(lp.packageDefinition?.height || 0, unitSystem)}
                    </p>
                    <span className="text-[10px] font-semibold text-blue-600">
                      {formatWeight(lp.packageDefinition?.weightKg || 0, unitSystem)}
                    </span>
                  </div>

                  <button
                    onClick={() => onPlacePackage(lp.id)}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-blue-700"
                  >
                    <span>Place</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Placed Packages */}
        <div className="border-t border-slate-100 pt-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
            Inside Trailer ({placedPackages.length})
          </span>
          <div className="mt-2 space-y-1.5">
            {placedPackages.map((lp) => {
              const isSelected = selectedLoadPackageId === lp.id;
              return (
                <div
                  key={lp.id}
                  onClick={() => setSelectedLoadPackageId(isSelected ? null : lp.id)}
                  className={`cursor-pointer rounded-xl p-2.5 text-xs transition flex items-center justify-between ${
                    isSelected
                      ? 'border border-blue-500 bg-blue-50/80 text-blue-900 shadow-sm'
                      : 'border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                      <Check className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="font-medium text-[11px]">{lp.packageDefinition?.name}</p>
                      <span className="text-[9px] text-slate-400">{formatWeight(lp.packageDefinition?.weightKg || 0, unitSystem)}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">Positioned</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal to add package */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-apple-lg border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add Cargo to Load</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700">Select Item</label>
                <select
                  value={selectedDefId}
                  onChange={(e) => setSelectedDefId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:outline-none focus:border-blue-600"
                >
                  {packageDefinitions.map((def) => (
                    <option key={def.id} value={def.id}>
                      {def.name} ({formatWeight(def.weightKg)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onAddPackage(selectedDefId, quantity);
                  setIsAddModalOpen(false);
                }}
                disabled={!selectedDefId}
                className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Add Items
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}


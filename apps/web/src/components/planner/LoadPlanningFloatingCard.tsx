'use client';

import React, { useState } from 'react';
import {
  ArrowUpRight,
  RotateCw,
  Plus,
  Search,
  QrCode,
  History,
  Trash2,
  Package,
  Layers,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { usePlannerStore } from '@/store/plannerStore';
import type { LoadPackageDto, VehicleDto } from '@cargoflow/shared-types';

interface LoadPlanningFloatingCardProps {
  loadPackages: LoadPackageDto[];
  vehicle?: VehicleDto;
  onAutoPack: () => void;
  onClearPlan: () => void;
  onOpenBarcode: () => void;
  onOpenAuditHistory: () => void;
  onRotateSelected: () => void;
  isPacking?: boolean;
}

export function LoadPlanningFloatingCard({
  loadPackages,
  vehicle,
  onAutoPack,
  onClearPlan,
  onOpenBarcode,
  onOpenAuditHistory,
  onRotateSelected,
  isPacking,
}: LoadPlanningFloatingCardProps) {
  const {
    selectedLoadPackageId,
    setSelectedLoadPackageId,
    placements,
  } = usePlannerStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const vehicleName = vehicle?.name || 'D17_TRUCK 2';

  // Filter packages based on search query
  const filteredPackages = loadPackages.filter((lp) => {
    if (!searchQuery) return true;
    const name = lp.packageDefinition?.name?.toLowerCase() || '';
    const sku = lp.packageDefinition?.sku?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return name.includes(q) || sku.includes(q);
  });

  return (
    <div className="w-[360px] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-4 select-none flex flex-col max-h-[580px]">
      {/* Top Code & Title */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono text-slate-400 block tracking-wider">C2-11_1</span>
          <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            Load Planning
          </h2>
        </div>
        <button
          onClick={onAutoPack}
          title="Auto-Pack Optimization"
          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-slate-100 transition"
        >
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={onClearPlan}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          Remove Assignment
        </button>
        <button
          onClick={onAutoPack}
          disabled={isPacking}
          className="px-3 py-1.5 rounded-xl bg-purple-600 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {isPacking ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          <span>+ Create New Plan</span>
        </button>
      </div>

      {/* Secondary Toolbar */}
      <div className="flex items-center justify-between gap-1.5 mt-3 pt-3 border-t border-slate-100">
        <button
          onClick={onClearPlan}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition"
        >
          <Trash2 className="h-3 w-3 text-slate-400" />
          <span>Clear Plan</span>
        </button>

        <div className="flex items-center gap-1">
          {/* Rotate action if package is selected */}
          {selectedLoadPackageId && (
            <button
              onClick={onRotateSelected}
              className="p-1.5 rounded-lg text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition"
              title="Rotate Selected Package"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Barcode / QR Label */}
          <button
            onClick={onOpenBarcode}
            className="p-1.5 rounded-lg text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition"
            title="Scan / View Barcode"
          >
            <QrCode className="h-3.5 w-3.5" />
          </button>

          {/* Audit History */}
          <button
            onClick={onOpenAuditHistory}
            className="p-1.5 rounded-lg text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition"
            title="Audit History"
          >
            <History className="h-3.5 w-3.5" />
          </button>

          {/* Search Toggle */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-1.5 rounded-lg transition ${
              isSearchOpen ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Filter Items"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search Input Filter */}
      {isSearchOpen && (
        <div className="mt-2">
          <input
            type="text"
            placeholder="Filter pallets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500"
            autoFocus
          />
        </div>
      )}

      {/* Items Table */}
      <div className="mt-3 flex-1 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
        <div className="grid grid-cols-12 px-3 py-1.5 bg-slate-50/80 text-[10px] font-semibold text-slate-400 uppercase tracking-wider sticky top-0 backdrop-blur-sm">
          <span className="col-span-3">Item</span>
          <span className="col-span-4">Vehicle</span>
          <span className="col-span-2 text-center">Seq..</span>
          <span className="col-span-3 text-right">Actions</span>
        </div>

        {filteredPackages.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No items in this plan.
          </div>
        ) : (
          filteredPackages.map((lp, idx) => {
            const isSelected = selectedLoadPackageId === lp.id;
            const isPlaced = placements.has(lp.id) || (lp.placements && lp.placements.length > 0);

            return (
              <div
                key={lp.id}
                onClick={() => setSelectedLoadPackageId(isSelected ? null : lp.id)}
                className={`grid grid-cols-12 items-center px-3 py-2 text-xs transition cursor-pointer ${
                  isSelected
                    ? 'bg-purple-50/80 text-purple-900 border-l-2 border-purple-600'
                    : 'hover:bg-slate-50/60 text-slate-700'
                }`}
              >
                {/* Item Column */}
                <div className="col-span-3 flex items-center gap-1.5">
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {lp.quantity || idx + 1}
                  </div>
                  <span className="truncate font-medium text-[11px]">
                    {lp.packageDefinition?.name?.slice(0, 7) || 'Pallet'}
                  </span>
                </div>

                {/* Vehicle Column */}
                <div className="col-span-4 truncate text-[11px] text-slate-500">
                  {vehicleName}
                </div>

                {/* Seq Column */}
                <div className="col-span-2 text-center text-[11px] font-mono text-slate-600">
                  {lp.stopSequence || idx + 1}
                </div>

                {/* Actions / Status Column */}
                <div className="col-span-3 flex items-center justify-end gap-1.5">
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                      isPlaced
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {isPlaced ? 'Placed' : 'Planning'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

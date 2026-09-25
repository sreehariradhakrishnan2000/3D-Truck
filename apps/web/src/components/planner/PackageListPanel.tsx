'use client';

import React, { useState } from 'react';
import { Search, Filter, MoreVertical, X, Package } from 'lucide-react';
import { usePlannerStore } from '@/store/plannerStore';
import type { LoadPackageDto } from '@cargoflow/shared-types';

interface PackageListPanelProps {
  loadPackages: LoadPackageDto[];
  onClose?: () => void;
}

export function PackageListPanel({ loadPackages, onClose }: PackageListPanelProps) {
  const { selectedLoadPackageId, setSelectedLoadPackageId, placements } = usePlannerStore();
  const [activeTab, setActiveTab] = useState<'all' | 'loaded' | 'unloaded'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Determine loaded status for each package
  const packagesWithStatus = loadPackages.map((lp, idx) => {
    const isPlaced = placements.has(lp.id) || (lp.placements && lp.placements.length > 0);
    const def = lp.packageDefinition;
    const pkgId = def?.sku || `PKG-${String(1001 + idx)}`;
    const lengthCm = Math.round((def?.length || 1000) / 10);
    const widthCm = Math.round((def?.width || 1000) / 10);
    const heightCm = Math.round((def?.height || 1000) / 10);
    const weightKg = Math.round(def?.weightKg || 500);

    return {
      id: lp.id,
      displayId: pkgId,
      dimensionsStr: `${lengthCm} × ${widthCm} × ${heightCm} cm`,
      weightKg,
      isLoaded: isPlaced,
      raw: lp,
    };
  });

  const loadedCount = packagesWithStatus.filter((p) => p.isLoaded).length;
  const unloadedCount = packagesWithStatus.filter((p) => !p.isLoaded).length;

  const filtered = packagesWithStatus.filter((p) => {
    if (activeTab === 'loaded' && !p.isLoaded) return false;
    if (activeTab === 'unloaded' && p.isLoaded) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.displayId.toLowerCase().includes(q) || p.dimensionsStr.includes(q);
    }
    return true;
  });

  return (
    <div className="w-[380px] bg-white rounded-2xl shadow-sm border border-slate-200/90 flex flex-col h-full max-h-[520px] select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">Package List</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pt-3 flex items-center gap-1.5">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All {packagesWithStatus.length}
        </button>
        <button
          onClick={() => setActiveTab('loaded')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
            activeTab === 'loaded'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Loaded {loadedCount}
        </button>
        <button
          onClick={() => setActiveTab('unloaded')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
            activeTab === 'unloaded'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unloaded {unloadedCount}
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2.5">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
          <Filter className="absolute right-3 h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-12 px-4 py-1.5 bg-slate-50/70 border-y border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        <span className="col-span-1"></span>
        <span className="col-span-4">ID</span>
        <span className="col-span-4">Dimensions</span>
        <span className="col-span-2 text-right">Weight</span>
        <span className="col-span-1"></span>
      </div>

      {/* Packages Table Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No packages found.
          </div>
        ) : (
          filtered.map((pkg) => {
            const isSelected = selectedLoadPackageId === pkg.id;

            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedLoadPackageId(isSelected ? null : pkg.id)}
                className={`grid grid-cols-12 items-center px-4 py-2 text-xs transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 text-blue-900 border-l-2 border-blue-600'
                    : 'hover:bg-slate-50/70 text-slate-700'
                }`}
              >
                {/* Checkbox */}
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* ID with Icon */}
                <div className="col-span-4 flex items-center gap-1.5 truncate">
                  <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-[11px] truncate">{pkg.displayId}</span>
                </div>

                {/* Dimensions */}
                <div className="col-span-4 text-[10px] text-slate-500 truncate font-mono">
                  {pkg.dimensionsStr}
                </div>

                {/* Weight & Status Badge */}
                <div className="col-span-2 flex flex-col items-end">
                  <span className="text-[11px] font-bold text-slate-800">{pkg.weightKg} kg</span>
                  <span
                    className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded-full mt-0.5 ${
                      pkg.isLoaded
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {pkg.isLoaded ? 'Loaded' : 'Unloaded'}
                  </span>
                </div>

                {/* Options Menu */}
                <div className="col-span-1 flex items-center justify-end text-slate-400 hover:text-slate-600">
                  <MoreVertical className="h-3.5 w-3.5" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

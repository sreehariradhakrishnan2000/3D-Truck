'use client';

import React from 'react';
import { usePlannerStore } from '@/store/plannerStore';
import type { LoadDto } from '@cargoflow/shared-types';

interface ReferenceKpiPillsProps {
  load: LoadDto;
}

export function ReferenceKpiPills({ load }: ReferenceKpiPillsProps) {
  const { validationResult } = usePlannerStore();

  const totalWeightKg = load.totalWeightKg > 0 ? Math.round(load.totalWeightKg) : 7340;
  const palletCount = load.packageCount > 0 ? load.packageCount : 120;
  const alertCount = validationResult?.issues?.length ?? 62;

  return (
    <div className="flex items-center justify-center gap-8 select-none py-1">
      {/* Weight KPI */}
      <div className="flex flex-col items-center">
        <span className="text-[11px] font-medium text-slate-400">Weight</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xl font-bold text-slate-800 tracking-tight">
            {totalWeightKg.toLocaleString()}kg
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white shadow-sm">
            +33%
          </span>
        </div>
      </div>

      {/* Pallets KPI */}
      <div className="flex flex-col items-center">
        <span className="text-[11px] font-medium text-slate-400">Pallets</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xl font-bold text-slate-800 tracking-tight">
            {palletCount}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white shadow-sm">
            +15%
          </span>
        </div>
      </div>

      {/* Alerts KPI */}
      <div className="flex flex-col items-center">
        <span className="text-[11px] font-medium text-slate-400">Alerts</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xl font-bold text-slate-800 tracking-tight">
            {alertCount}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-600 text-white shadow-sm">
            -22%
          </span>
        </div>
      </div>
    </div>
  );
}

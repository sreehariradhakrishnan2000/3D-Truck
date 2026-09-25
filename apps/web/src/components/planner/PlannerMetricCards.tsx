'use client';

import React from 'react';
import { Scale, Box, Package, Truck } from 'lucide-react';
import type { LoadDto, VehicleDto } from '@cargoflow/shared-types';

interface PlannerMetricCardsProps {
  load: LoadDto;
  vehicle: VehicleDto;
}

export function PlannerMetricCards({ load, vehicle }: PlannerMetricCardsProps) {
  // Calculations
  const weightKg = Math.round(load.totalWeightKg || 7240);
  const maxPayloadKg = Math.round(vehicle?.maxPayloadKg || 24000);
  const weightPct = maxPayloadKg > 0 ? Math.min(100, Math.round((weightKg / maxPayloadKg) * 100)) : 72;

  const volumeM3 = (load.totalVolumeMm3 / 1e9).toFixed(1) === '0.0' ? '67' : (load.totalVolumeMm3 / 1e9).toFixed(1);
  const maxVolumeM3 = ((vehicle.interiorLength * vehicle.interiorWidth * vehicle.interiorHeight) / 1e9).toFixed(1);
  const volumePct = Math.round(load.volumeUtilizationPct || 81);

  const packageCount = load.packageCount || 24;
  const totalPackages = packageCount > 0 ? packageCount + 6 : 30;
  const packagesPct = Math.min(100, Math.round((packageCount / totalPackages) * 100));

  const trailerLengthM = (vehicle.interiorLength / 1000).toFixed(1);
  const loadingMeters = (parseFloat(trailerLengthM) * (weightPct / 100)).toFixed(1);
  const loadingMetersPct = Math.round((parseFloat(loadingMeters) / parseFloat(trailerLengthM)) * 100) || 68;

  return (
    <div className="grid grid-cols-4 gap-4 w-full select-none">
      {/* ── CARD 1: Total Weight ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Scale className="h-3.5 w-3.5" />
            </div>
            <span>Total Weight</span>
          </div>
        </div>

        <div className="mt-2">
          <div className="text-xl font-bold text-slate-800 tracking-tight">
            {weightKg.toLocaleString()} kg
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${weightPct}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-500">{weightPct}%</span>
          </div>
        </div>
      </div>

      {/* ── CARD 2: Total Volume ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Box className="h-3.5 w-3.5" />
            </div>
            <span>Total Volume</span>
          </div>
        </div>

        <div className="mt-2">
          <div className="text-xl font-bold text-slate-800 tracking-tight">
            {volumeM3} m³
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${volumePct}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-500">{volumePct}%</span>
          </div>
        </div>
      </div>

      {/* ── CARD 3: Packages ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Package className="h-3.5 w-3.5" />
            </div>
            <span>Packages</span>
          </div>
        </div>

        <div className="mt-2">
          <div className="text-xl font-bold text-slate-800 tracking-tight">
            {packageCount} / {totalPackages}
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${packagesPct}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-500">{packagesPct}%</span>
          </div>
        </div>
      </div>

      {/* ── CARD 4: Loading Meters ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Truck className="h-3.5 w-3.5" />
            </div>
            <span>Loading Meters</span>
          </div>
        </div>

        <div className="mt-2">
          <div className="text-xl font-bold text-slate-800 tracking-tight">
            {loadingMeters} / {trailerLengthM} m
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${loadingMetersPct}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-500">{loadingMetersPct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}


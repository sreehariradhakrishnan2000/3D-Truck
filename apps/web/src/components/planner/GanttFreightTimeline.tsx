'use client';

import React, { useState } from 'react';
import { ChevronDown, Package, SlidersHorizontal } from 'lucide-react';
import type { LoadPackageDto } from '@cargoflow/shared-types';

interface GanttFreightTimelineProps {
  loadPackages: LoadPackageDto[];
}

export function GanttFreightTimeline({ loadPackages }: GanttFreightTimelineProps) {
  const [selectedUnits, setSelectedUnits] = useState<Record<string, boolean>>({});

  const toggleUnit = (id: string) => {
    setSelectedUnits((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Sample items or from actual packages
  const units = loadPackages.length > 0
    ? loadPackages.map((lp, idx) => ({
        id: lp.id,
        code: `647771520${idx + 1}`,
        weight: `${Math.round(lp.packageDefinition?.weightKg || 500)}kg`,
      }))
    : [
        { id: '1', code: '6477715203', weight: '100kg' },
        { id: '2', code: '6477715204', weight: '800kg' },
      ];

  return (
    <div className="grid grid-cols-12 gap-3 w-full px-4 select-none">
      {/* ── LEFT PANEL: Freight Units ── */}
      <div className="col-span-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/80 p-3.5 flex flex-col">
        {/* Header Tabs */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-800">Freight Units</span>
          </div>
          <button className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition">
            <span>Freight Orders</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Timestamps Subheader */}
        <div className="grid grid-cols-4 py-1.5 text-[10px] text-slate-400 font-mono">
          <span>00-00</span>
          <span className="text-center">06-00</span>
          <span className="text-center">12-00</span>
          <span className="text-right">18-00</span>
        </div>

        {/* Unit list */}
        <div className="space-y-1.5 mt-1">
          {units.slice(0, 3).map((unit) => {
            const isChecked = selectedUnits[unit.id] ?? false;
            return (
              <div
                key={unit.id}
                onClick={() => toggleUnit(unit.id)}
                className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/70 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <Package className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs font-mono font-medium text-slate-700">
                    {unit.code}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-600">
                  {unit.weight}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL: Gantt Chart ── */}
      <div className="col-span-9 bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/80 p-3.5 flex flex-col">
        {/* Header Tabs & Controls */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-800">Gant Chart</span>
            <button className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition">
              <span>Freight Orders</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          {/* Timeline Zoom Slider Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">-</span>
            <div className="w-14 h-1.5 bg-slate-200 rounded-full relative flex items-center">
              <div className="w-3 h-3 bg-slate-800 rounded-full shadow-sm cursor-pointer" />
            </div>
            <span className="text-xs text-slate-400 font-bold">+</span>
            <div className="w-px h-3.5 bg-slate-200 mx-1" />
            <button className="p-1 rounded text-slate-400 hover:text-slate-600">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Multi-Day Timeline Header */}
        <div className="grid grid-cols-4 pt-2 pb-1 text-center divide-x divide-slate-100">
          <div>
            <div className="text-[11px] font-bold text-slate-700">Jun 14, 2024</div>
            <div className="grid grid-cols-4 text-[9px] text-slate-400 font-mono mt-0.5">
              <span>00-00</span>
              <span>06-00</span>
              <span>12-00</span>
              <span>18-00</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-700">15, Jun</div>
            <div className="grid grid-cols-4 text-[9px] text-slate-400 font-mono mt-0.5">
              <span>00-00</span>
              <span>06-00</span>
              <span className="font-bold text-purple-700">12-00</span>
              <span>18-00</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-700">16, Jun</div>
            <div className="grid grid-cols-4 text-[9px] text-slate-400 font-mono mt-0.5">
              <span>00-00</span>
              <span>06-00</span>
              <span>12-00</span>
              <span>18-00</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-700">17, Jun</div>
            <div className="grid grid-cols-4 text-[9px] text-slate-400 font-mono mt-0.5">
              <span>00-00</span>
              <span>06-00</span>
              <span>12-00</span>
              <span>18-00</span>
            </div>
          </div>
        </div>

        {/* Gantt Schedule Rows with Red Marker Line */}
        <div className="relative mt-2 space-y-2">
          {/* Vertical Red Marker Line at current time (15 Jun 12:00) */}
          <div className="absolute left-[44%] top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none opacity-80" />

          {/* Lane 1 */}
          <div className="flex items-center gap-1 h-7">
            {/* Active Purple Transit Bar */}
            <div className="w-[45%] h-full rounded-lg bg-gradient-to-r from-purple-600 via-purple-600 to-purple-400 text-white flex items-center justify-between px-2.5 shadow-sm">
              <span className="text-[10px] font-bold tracking-tight">SLO_MADRID</span>
              <span className="text-[9px] font-mono opacity-80">6477715203</span>
            </div>
            {/* Scheduled Grey Leg */}
            <div className="w-[30%] h-full rounded-lg bg-slate-100 text-slate-700 flex items-center justify-between px-2.5">
              <span className="text-[10px] font-medium">SLO_BERLIN</span>
            </div>
            {/* Later Leg */}
            <div className="flex-1 h-full rounded-lg bg-slate-100 text-slate-700 flex items-center justify-between px-2.5">
              <span className="text-[10px] font-medium">SLO_BERLIN</span>
              <span className="text-[9px] font-mono text-slate-400">6477715203</span>
            </div>
          </div>

          {/* Lane 2 */}
          <div className="flex items-center gap-1 h-7">
            <div className="w-[20%] h-full rounded-lg bg-slate-100 text-slate-700 flex items-center justify-between px-2">
              <span className="text-[10px] font-medium truncate">_MADRID</span>
              <span className="text-[9px] font-mono text-slate-400">6477715203</span>
            </div>
            <div className="w-[15%] h-full rounded-lg bg-slate-100 text-slate-700 flex items-center px-2">
              <span className="text-[10px] font-medium truncate">SLO_BERLIN</span>
            </div>
            <div className="w-[25%] h-full rounded-lg bg-slate-100 text-slate-700 flex items-center justify-between px-2">
              <span className="text-[10px] font-medium">SLO_BERLIN</span>
              <span className="text-[9px] font-mono text-slate-400">6477715203</span>
            </div>
            <div className="w-[15%] h-full rounded-lg bg-slate-100 text-slate-700 flex items-center px-2">
              <span className="text-[10px] font-medium truncate">SLO_BERLIN</span>
            </div>
            {/* Final Purple Delivery Bar */}
            <div className="flex-1 h-full rounded-lg bg-purple-600 text-white flex items-center justify-between px-2.5 shadow-sm">
              <span className="text-[10px] font-bold">SLO_BERLIN</span>
              <span className="text-[9px] font-mono opacity-80">6477715203</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


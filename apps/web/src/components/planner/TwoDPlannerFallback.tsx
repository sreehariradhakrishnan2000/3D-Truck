'use client';

import { useMemo } from 'react';
import { usePlannerStore } from '@/store/plannerStore';
import { applyRotation } from '@cargoflow/geometry';
import { formatDimension, formatWeight } from '@/lib/utils';
import type { VehicleDto, LoadPackageDto } from '@cargoflow/shared-types';

interface TwoDPlannerFallbackProps {
  vehicle: VehicleDto;
  loadPackages: LoadPackageDto[];
}

export function TwoDPlannerFallback({ vehicle, loadPackages }: TwoDPlannerFallbackProps) {
  const {
    placements,
    selectedLoadPackageId,
    setSelectedLoadPackageId,
    collidingPackageIds,
  } = usePlannerStore();

  const trailerLength = vehicle.interiorLength; // mm
  const trailerWidth = vehicle.interiorWidth;   // mm

  const placedItems = useMemo(() => {
    const list: Array<{
      pkg: LoadPackageDto;
      placement: { x: number; y: number; z: number; rotationIndex: any };
    }> = [];

    loadPackages.forEach((lp) => {
      const placement = placements.get(lp.id);
      if (placement) {
        list.push({ pkg: lp, placement });
      } else if (lp.placements && lp.placements.length > 0) {
        list.push({ pkg: lp, placement: lp.placements[0] });
      }
    });

    return list;
  }, [loadPackages, placements]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 p-6 overflow-auto">
      <div className="mb-3 flex items-center justify-between w-full max-w-4xl">
        <span className="text-xs font-semibold text-slate-700">
          2D Floor Blueprint View (Top-Down)
        </span>
        <span className="text-[10px] text-slate-500">
          Front (Cabin) ←── Length ({formatDimension(trailerLength)}) ──→ Rear (Door)
        </span>
      </div>

      <div className="relative w-full max-w-4xl rounded-2xl border-2 border-slate-300 bg-white shadow-apple-md overflow-hidden aspect-[4/1]">
        {/* Rear Door Indicator */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4/5 w-2 bg-amber-500 rounded-l" />

        {/* Cargo Items rendered proportionally */}
        {placedItems.map(({ pkg, placement }) => {
          const dims = {
            length: pkg.packageDefinition?.length || 1000,
            width: pkg.packageDefinition?.width || 1000,
            height: pkg.packageDefinition?.height || 1000,
          };
          const effective = applyRotation(dims, placement.rotationIndex);

          // Percentages for SVG / absolute positioning
          const leftPct = (placement.x / trailerLength) * 100;
          const topPct = (placement.y / trailerWidth) * 100;
          const widthPct = (effective.length / trailerLength) * 100;
          const heightPct = (effective.width / trailerWidth) * 100;

          const isSelected = selectedLoadPackageId === pkg.id;
          const isColliding = collidingPackageIds.has(pkg.id);

          return (
            <div
              key={pkg.id}
              onClick={() => setSelectedLoadPackageId(isSelected ? null : pkg.id)}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
              }}
              className={`absolute cursor-pointer border rounded-md transition-all flex flex-col items-center justify-center text-[10px] font-semibold select-none ${
                isColliding
                  ? 'border-red-600 bg-red-100/90 text-red-800'
                  : isSelected
                  ? 'border-blue-600 bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                  : 'border-slate-400 bg-slate-200/90 text-slate-800 hover:bg-slate-300/80'
              }`}
            >
              <span className="truncate px-1">{pkg.packageDefinition?.name}</span>
              <span className="text-[8px] font-mono text-slate-500">{formatWeight(pkg.packageDefinition?.weightKg || 0)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


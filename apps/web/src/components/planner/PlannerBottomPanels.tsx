'use client';

import React from 'react';
import {
  Grid,
  Tag,
  Ruler,
  Crosshair,
  Eye,
  Sun,
  Moon,
  Sparkles,
  Package,
  Truck,
} from 'lucide-react';
import { usePlannerStore } from '@/store/plannerStore';
import type { LoadPackageDto, VehicleDto } from '@cargoflow/shared-types';

interface PlannerBottomPanelsProps {
  loadPackages: LoadPackageDto[];
  vehicle: VehicleDto;
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
  showDimensions: boolean;
  setShowDimensions: (v: boolean) => void;
  showCenterOfGravity: boolean;
  setShowCenterOfGravity: (v: boolean) => void;
  transparentWalls: boolean;
  setTransparentWalls: (v: boolean) => void;
  lightingMode: 'light' | 'dark' | 'studio';
  setLightingMode: (m: 'light' | 'dark' | 'studio') => void;
}

export function PlannerBottomPanels({
  loadPackages,
  vehicle,
  showGrid,
  setShowGrid,
  showLabels,
  setShowLabels,
  showDimensions,
  setShowDimensions,
  showCenterOfGravity,
  setShowCenterOfGravity,
  transparentWalls,
  setTransparentWalls,
  lightingMode,
  setLightingMode,
}: PlannerBottomPanelsProps) {
  const { selectedLoadPackageId, placements } = usePlannerStore();

  // Find currently selected package
  const selectedLp = loadPackages.find((lp) => lp.id === selectedLoadPackageId);
  const selectedPlacement = selectedLoadPackageId ? placements.get(selectedLoadPackageId) : null;

  const pkgId = selectedLp?.packageDefinition?.sku || 'PKG-1004';
  const def = selectedLp?.packageDefinition;

  const lengthCm = def ? Math.round(def.length / 10) : 120;
  const widthCm = def ? Math.round(def.width / 10) : 120;
  const heightCm = def ? Math.round(def.height / 10) : 120;
  const weightKg = def ? Math.round(def.weightKg) : 750;
  const volumeM3 = def ? ((def.length * def.width * def.height) / 1e9).toFixed(2) : '1.73';

  const posX = selectedPlacement ? (selectedPlacement.x / 1000).toFixed(1) : '4.8';
  const posY = selectedPlacement ? (selectedPlacement.y / 1000).toFixed(1) : '1.2';
  const posZ = selectedPlacement ? (selectedPlacement.z / 1000).toFixed(1) : '0.6';

  return (
    <div className="grid grid-cols-12 gap-4 w-full select-none">
      {/* ── CARD 1: Selected Package ── */}
      <div className="col-span-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
        <h4 className="text-xs font-bold text-slate-800 tracking-tight">Selected Package</h4>

        <div className="flex items-center gap-4 mt-2">
          {/* 3D Box Thumbnail */}
          <div className="w-20 h-20 rounded-xl bg-amber-50 border border-amber-200/60 flex flex-col items-center justify-center p-2 text-amber-800 shrink-0 shadow-inner">
            <Package className="h-9 w-9 text-amber-600 mb-0.5" />
            <span className="text-[9px] font-mono font-bold">FRAGILE</span>
          </div>

          {/* Package Details */}
          <div className="flex-1 space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{pkgId}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700">
                Loaded
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-2 text-[11px] text-slate-500 pt-0.5">
              <div>
                Dimensions: <span className="font-semibold text-slate-700">{lengthCm} × {widthCm} × {heightCm} cm</span>
              </div>
              <div>
                Weight: <span className="font-semibold text-slate-700">{weightKg} kg</span>
              </div>
              <div>
                Volume: <span className="font-semibold text-slate-700">{volumeM3} m³</span>
              </div>
              <div>
                Rotation: <span className="font-semibold text-slate-700">0° 0° 0°</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 pt-0.5">
              Position: <span className="font-mono font-semibold text-slate-700">X: {posX} m   Y: {posY} m   Z: {posZ} m</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 2: Trailer Information ── */}
      <div className="col-span-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
        <h4 className="text-xs font-bold text-slate-800 tracking-tight">Trailer Information</h4>

        <div className="flex items-center gap-4 mt-2">
          {/* Trailer Graphic Thumbnail */}
          <div className="w-24 h-20 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0">
            <Truck className="h-10 w-10 text-slate-500" />
          </div>

          {/* Trailer Specs */}
          <div className="flex-1 space-y-1 text-xs">
            <div className="font-bold text-slate-900 text-sm">
              {vehicle?.name || 'Standard Dry Van (53 ft)'}
            </div>

            <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[11px] text-slate-500 pt-0.5">
              <div>
                Length: <span className="font-semibold text-slate-700">{(vehicle.interiorLength / 1000).toFixed(2)} m</span>
              </div>
              <div>
                Width: <span className="font-semibold text-slate-700">{(vehicle.interiorWidth / 1000).toFixed(2)} m</span>
              </div>
              <div>
                Height: <span className="font-semibold text-slate-700">{(vehicle.interiorHeight / 1000).toFixed(2)} m</span>
              </div>
              <div className="col-span-2">
                Max Payload: <span className="font-semibold text-slate-700">{vehicle.maxPayloadKg.toLocaleString()} kg</span>
              </div>
              <div>
                Door: <span className="font-semibold text-slate-700">{(vehicle.doorWidth / 1000).toFixed(2)} m</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 3: Camera & Display Controls ── */}
      <div className="col-span-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
        <h4 className="text-xs font-bold text-slate-800 tracking-tight">Camera & Display</h4>

        {/* Display Toggles */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mt-2">
          {/* Show Grid */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-1.5 text-slate-600 text-[11px] font-medium">
              <Grid className="h-3 w-3 text-slate-400" />
              <span>Show Grid</span>
            </span>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>

          {/* Show Package Labels */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-1.5 text-slate-600 text-[11px] font-medium">
              <Tag className="h-3 w-3 text-slate-400" />
              <span>Show Package Labels</span>
            </span>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>

          {/* Show Dimensions */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-1.5 text-slate-600 text-[11px] font-medium">
              <Ruler className="h-3 w-3 text-slate-400" />
              <span>Show Dimensions</span>
            </span>
            <input
              type="checkbox"
              checked={showDimensions}
              onChange={(e) => setShowDimensions(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>

          {/* Show Center of Gravity */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-1.5 text-slate-600 text-[11px] font-medium">
              <Crosshair className="h-3 w-3 text-slate-400" />
              <span>Show Center of Gravity</span>
            </span>
            <input
              type="checkbox"
              checked={showCenterOfGravity}
              onChange={(e) => setShowCenterOfGravity(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>

          {/* Transparent Walls */}
          <label className="flex items-center justify-between cursor-pointer col-span-2">
            <span className="flex items-center gap-1.5 text-slate-600 text-[11px] font-medium">
              <Eye className="h-3 w-3 text-slate-400" />
              <span>Transparent Walls</span>
            </span>
            <input
              type="checkbox"
              checked={transparentWalls}
              onChange={(e) => setTransparentWalls(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>
        </div>

        {/* Lighting Mode Selector */}
        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
          <span className="text-[11px] font-medium text-slate-500">Lighting</span>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setLightingMode('light')}
              className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                lightingMode === 'light'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setLightingMode('dark')}
              className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                lightingMode === 'dark'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setLightingMode('studio')}
              className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                lightingMode === 'studio'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


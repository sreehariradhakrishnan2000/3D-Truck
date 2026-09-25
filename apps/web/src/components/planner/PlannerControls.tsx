'use client';

import { Camera, Eye, RotateCw, Sparkles, Trash2, Layers } from 'lucide-react';
import { usePlannerStore } from '@/store/plannerStore';
import type { RotationIndex } from '@cargoflow/shared-types';

interface PlannerControlsProps {
  onAutoPack: () => void;
  onRotateSelected: () => void;
  onRemoveSelected: () => void;
  isPacking?: boolean;
}

export function PlannerControls({
  onAutoPack,
  onRotateSelected,
  onRemoveSelected,
  isPacking,
}: PlannerControlsProps) {
  const {
    viewMode,
    setViewMode,
    cameraPreset,
    setCameraPreset,
    selectedLoadPackageId,
  } = usePlannerStore();

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
      {/* Left controls: Camera presets & View mode */}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 p-1.5 shadow-apple-sm backdrop-blur-md pointer-events-auto">
        <button
          onClick={() => setViewMode(viewMode === '3D' ? '2D' : '3D')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
            viewMode === '3D'
              ? 'bg-blue-50 text-blue-600'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>{viewMode} Mode</span>
        </button>

        {viewMode === '3D' && (
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            {(['isometric', 'top', 'side', 'back'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setCameraPreset(preset)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize transition ${
                  cameraPreset === preset
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right controls: Selection actions & Auto-Pack */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {selectedLoadPackageId && (
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/90 p-1.5 shadow-apple-sm backdrop-blur-md">
            <button
              onClick={onRotateSelected}
              className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
              title="Rotate Box Orientation"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Rotate</span>
            </button>
            <button
              onClick={onRemoveSelected}
              className="flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
              title="Unplace Package"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <button
          onClick={onAutoPack}
          disabled={isPacking}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-apple-md transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
        >
          {isPacking ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          <span>Auto-Pack Cargo</span>
        </button>
      </div>
    </div>
  );
}


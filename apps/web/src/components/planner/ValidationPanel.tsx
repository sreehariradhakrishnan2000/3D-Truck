'use client';

import { AlertCircle, CheckCircle2, Users, Scale, Gauge, ShieldAlert, Route } from 'lucide-react';
import { usePlannerStore } from '@/store/plannerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatWeight, formatVolume } from '@/lib/units';
import type { LoadDto, VehicleDto } from '@cargoflow/shared-types';

interface ValidationPanelProps {
  load: LoadDto;
  vehicle: VehicleDto;
}

export function ValidationPanel({ load, vehicle }: ValidationPanelProps) {
  const { unitSystem } = useSettingsStore();
  const {
    validationResult,
    activeCollaborators,
    conflictMessage,
    setConflictMessage,
  } = usePlannerStore();

  const weightDist = validationResult?.weightDistribution;
  const totalWeight = weightDist?.totalWeightKg ?? load.totalWeightKg;
  const weightPct = vehicle.maxPayloadKg > 0 ? (totalWeight / vehicle.maxPayloadKg) * 100 : 0;
  const volumePct = load.volumeUtilizationPct || 0;

  const frontRear = weightDist ? weightDist.frontRearRatio * 100 : 50;
  const leftRight = weightDist ? weightDist.leftRightRatio * 100 : 50;

  return (
    <aside className="w-80 flex-shrink-0 border-l border-slate-200/80 bg-white flex flex-col h-full z-10">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Load Diagnostics</h3>
        {validationResult?.isValid ? (
          <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Feasible
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <AlertCircle className="h-3 w-3" />
            Check Warnings
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Conflict / Concurrency Notification */}
        {conflictMessage && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{conflictMessage}</p>
              <button
                onClick={() => setConflictMessage(null)}
                className="mt-1 text-[10px] font-semibold text-amber-900 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Real-time Collaboration presence */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              Real-time Active Users
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {activeCollaborators.length > 0
              ? `${activeCollaborators.length} collaborator(s) online`
              : 'You are the only planner active'}
          </p>
        </div>

        {/* Volume Utilization Meter */}
        <div>
          <div className="flex justify-between text-xs">
            <span className="font-medium text-slate-600">Volume Capacity</span>
            <span className="font-bold text-slate-900">{volumePct.toFixed(1)}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                volumePct > 95 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, volumePct)}%` }}
            />
          </div>
          <span className="mt-1 block text-[10px] text-slate-400 text-right">
            Trailer: {formatVolume(vehicle.interiorLength * vehicle.interiorWidth * vehicle.interiorHeight, unitSystem)}
          </span>
        </div>

        {/* Weight Utilization Meter */}
        <div>
          <div className="flex justify-between text-xs">
            <span className="font-medium text-slate-600">Weight Capacity</span>
            <span className={`font-bold ${weightPct > 100 ? 'text-red-600' : 'text-slate-900'}`}>
              {weightPct.toFixed(1)}%
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                weightPct > 100 ? 'bg-red-500' : weightPct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, weightPct)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>{formatWeight(totalWeight, unitSystem)} loaded</span>
            <span>Max: {formatWeight(vehicle.maxPayloadKg, unitSystem)}</span>
          </div>
        </div>

        {/* Center of Gravity Meters */}
        <div className="border-t border-slate-100 pt-4">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-blue-600" />
            Axle & Weight Balance
          </span>

          {/* Front vs Rear Balance */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
              <span>Front (Cabin)</span>
              <span className="font-semibold text-slate-800">{frontRear.toFixed(0)}%</span>
              <span>Rear (Door)</span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 z-10" />
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${frontRear}%` }}
              />
            </div>
          </div>

          {/* Left vs Right Balance */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
              <span>Left Side</span>
              <span className="font-semibold text-slate-800">{leftRight.toFixed(0)}%</span>
              <span>Right Side</span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 z-10" />
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${leftRight}%` }}
              />
            </div>
          </div>
        </div>

        {/* Delivery Accessibility Warning */}
        {validationResult && validationResult.deliveryAccessibilityWarnings > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Route className="h-4 w-4 text-amber-600" />
              Delivery Sequence Alerts ({validationResult.deliveryAccessibilityWarnings})
            </span>
            <p className="mt-1 text-[11px] text-amber-700">
              Cargo for earlier stops is blocked from exiting the rear door by cargo intended for later stops.
            </p>
          </div>
        )}

        {/* Validation Issues Alert Box */}
        {validationResult && validationResult.issues.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-3 space-y-2">
            <span className="text-xs font-bold text-red-800 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              Detected Issues ({validationResult.issues.length})
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {validationResult.issues.map((issue, idx) => (
                <div key={idx} className="text-[11px] text-red-700 bg-white/70 p-2 rounded-lg border border-red-100">
                  {issue.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}


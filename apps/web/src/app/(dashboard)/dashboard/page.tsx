'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Layers, Truck, Box, Plus, ArrowUpRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { formatWeight, formatVolume } from '@/lib/utils';
import type { LoadDto, VehicleDto, PackageDefinitionDto } from '@cargoflow/shared-types';

export default function DashboardPage() {
  const { data: loads = [], isLoading: loadsLoading } = useQuery({
    queryKey: ['loads'],
    queryFn: () => api.get<LoadDto[]>('/loads'),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<VehicleDto[]>('/vehicles'),
  });

  const { data: packageDefs = [] } = useQuery({
    queryKey: ['package-definitions'],
    queryFn: () => api.get<PackageDefinitionDto[]>('/package-definitions'),
  });

  const planningLoads = loads.filter((l) => l.status === 'PLANNING' || l.status === 'DRAFT');
  const readyLoads = loads.filter((l) => l.status === 'READY' || l.status === 'LOADED');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Logistics Overview</h1>
          <p className="mt-1 text-xs text-slate-500">Monitor and plan 3D cargo load assignments across your fleet</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/loads"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-apple-sm transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>New Load Plan</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-apple-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Load Plans</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{loads.length}</span>
            <span className="text-xs text-slate-400">{planningLoads.length} in planning</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-apple-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Trailer Fleet</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{vehicles.length}</span>
            <span className="text-xs text-emerald-600 font-medium">Ready for loading</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-apple-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Cargo Definitions</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Box className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{packageDefs.length}</span>
            <span className="text-xs text-slate-400">Pallets & Cartons</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-apple-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Ready to Dispatch</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{readyLoads.length}</span>
            <span className="text-xs text-slate-400">Validated loads</span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Active Loads List */}
      <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white shadow-apple-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Current Load Plans</h2>
            <p className="text-xs text-slate-500">Click any load to open the real-time 3D planner</p>
          </div>
          <Link href="/loads" className="text-xs font-medium text-blue-600 hover:underline">
            View all
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {loadsLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading load plans...</div>
          ) : loads.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-xs font-medium text-slate-600">No load plans created yet</p>
              <Link
                href="/loads"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Load</span>
              </Link>
            </div>
          ) : (
            loads.map((load) => (
              <Link
                key={load.id}
                href={`/loads/${load.id}`}
                className="flex items-center justify-between p-5 transition hover:bg-slate-50/80"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{load.loadNumber}</span>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        {load.status}
                      </span>
                      {load.validationPassed && (
                        <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Validated
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span>{load.vehicle?.name || 'Standard Trailer'}</span>
                      <span>•</span>
                      <span>{load.origin || 'Origin'} → {load.destination || 'Destination'}</span>
                      <span>•</span>
                      <span>{load.packageCount} items</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Utilization bar */}
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-medium text-slate-700">
                      {load.volumeUtilizationPct.toFixed(1)}% Volume
                    </div>
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, load.volumeUtilizationPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="hidden md:block text-right">
                    <div className="text-xs font-semibold text-slate-900">{formatWeight(load.totalWeightKg)}</div>
                    <div className="text-[10px] text-slate-400">Total Cargo</div>
                  </div>

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:text-blue-600">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


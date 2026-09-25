'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft, Truck, CheckSquare, ShieldCheck, QrCode } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDimension, formatWeight, formatVolume } from '@/lib/utils';
import type { LoadDto, VehicleDto, LoadPackageDto } from '@cargoflow/shared-types';

export default function LoadManifestPrintPage() {
  const params = useParams();
  const router = useRouter();
  const loadId = params.id as string;

  const { data: load, isLoading } = useQuery({
    queryKey: ['load', loadId],
    queryFn: () => api.get<LoadDto & { loadPackages: LoadPackageDto[]; vehicle: VehicleDto }>(`/loads/${loadId}`),
  });

  const { data: sequence = [] } = useQuery({
    queryKey: ['load-sequence', loadId],
    queryFn: () => api.get<any[]>(`/loads/${loadId}/sequence`),
  });

  if (isLoading || !load) {
    return <div className="p-8 text-center text-xs text-slate-500">Generating loading manifest...</div>;
  }

  const v = load.vehicle;

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 print:bg-white print:p-0">
      {/* Top Bar (Hidden in Print) */}
      <div className="mx-auto max-w-4xl mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Planner</span>
        </button>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-apple-sm hover:bg-blue-700"
        >
          <Printer className="h-4 w-4" />
          <span>Print Manifest Sheet</span>
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-apple-md print:border-none print:shadow-none print:p-6 print:rounded-none">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Truck className="h-5 w-5" />
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900">CargoFlow</span>
            </div>
            <h1 className="mt-2 text-lg font-bold text-slate-900">Official Loading Plan & Cargo Manifest</h1>
            <p className="text-xs text-slate-500">Document ID: {load.id}</p>
          </div>

          <div className="text-right">
            <span className="inline-block rounded-md bg-slate-100 px-3 py-1 text-sm font-mono font-bold text-slate-900">
              {load.loadNumber}
            </span>
            <p className="mt-1 text-xs text-slate-500">
              Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Load & Vehicle Metadata Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 mb-1">Route & Schedule</h3>
            <p><span className="text-slate-500">Origin:</span> {load.origin || 'Main Depot'}</p>
            <p><span className="text-slate-500">Destination:</span> {load.destination || 'Delivery Terminal'}</p>
            <p><span className="text-slate-500">Status:</span> <strong className="uppercase">{load.status}</strong></p>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-1">Assigned Vehicle</h3>
            <p><span className="text-slate-500">Trailer:</span> {v?.name || 'Standard'}</p>
            <p><span className="text-slate-500">Dimensions:</span> {formatDimension(v?.interiorLength || 0)} × {formatDimension(v?.interiorWidth || 0)} × {formatDimension(v?.interiorHeight || 0)}</p>
            <p><span className="text-slate-500">Max Payload:</span> {formatWeight(v?.maxPayloadKg || 0)}</p>
          </div>
        </div>

        {/* Load Metrics Summary */}
        <div className="mt-4 grid grid-cols-4 gap-3 text-center text-xs">
          <div className="rounded-xl border border-slate-200 p-2.5">
            <span className="text-[10px] text-slate-400">Total Packages</span>
            <p className="font-bold text-slate-800 text-sm">{load.packageCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-2.5">
            <span className="text-[10px] text-slate-400">Gross Cargo Weight</span>
            <p className="font-bold text-slate-800 text-sm">{formatWeight(load.totalWeightKg)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-2.5">
            <span className="text-[10px] text-slate-400">Volume Utilized</span>
            <p className="font-bold text-slate-800 text-sm">{load.volumeUtilizationPct.toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-2.5">
            <span className="text-[10px] text-slate-400">Validation Status</span>
            <p className="font-bold text-emerald-600 text-sm">Verified & Feasible</p>
          </div>
        </div>

        {/* Step-by-Step Sequence Table */}
        <div className="mt-6">
          <h2 className="text-sm font-bold text-slate-900 mb-2">Step-by-Step Loading Sequence</h2>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-2 px-2 w-12 text-center">Step</th>
                <th className="py-2 px-2">Item Description</th>
                <th className="py-2 px-2">Dimensions (mm)</th>
                <th className="py-2 px-2">Weight</th>
                <th className="py-2 px-2">Placement Coordinates</th>
                <th className="py-2 px-2">Handling Flags</th>
                <th className="py-2 px-2 w-16 text-center">Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sequence.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                    Run Auto-Pack to generate the loading sequence.
                  </td>
                </tr>
              ) : (
                sequence.map((item, idx) => {
                  const lp = item.loadPackage;
                  const def = lp?.packageDefinition;
                  const pl = lp?.placements?.[0];

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2 text-center font-bold text-blue-600">{item.sequenceOrder}</td>
                      <td className="py-2 px-2 font-medium text-slate-900">{def?.name || 'Cargo Item'}</td>
                      <td className="py-2 px-2 text-slate-600">{def?.length} × {def?.width} × {def?.height}</td>
                      <td className="py-2 px-2 font-semibold text-slate-800">{formatWeight(def?.weightKg || 0)}</td>
                      <td className="py-2 px-2 font-mono text-[11px] text-slate-600">
                        {pl ? `X: ${Math.round(pl.x)} | Y: ${Math.round(pl.y)} | Z: ${Math.round(pl.z)}` : 'Floor'}
                      </td>
                      <td className="py-2 px-2">
                        {def?.isFragile && <span className="mr-1 text-[9px] font-bold text-amber-600">FRAGILE</span>}
                        {def?.requiresUprightOrientation && <span className="text-[9px] font-bold text-blue-600">UPRIGHT</span>}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="mx-auto h-4 w-4 rounded border border-slate-400" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Verification Signatures */}
        <div className="mt-12 grid grid-cols-2 gap-8 border-t border-slate-200 pt-6 text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-800">Warehouse Loading Supervisor</p>
            <div className="mt-8 border-b border-slate-300 w-3/4" />
            <p className="mt-1 text-[10px] text-slate-400">Signature & Date</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Transport Driver Receipt</p>
            <div className="mt-8 border-b border-slate-300 w-3/4" />
            <p className="mt-1 text-[10px] text-slate-400">Signature & Date</p>
          </div>
        </div>
      </div>
    </div>
  );
}


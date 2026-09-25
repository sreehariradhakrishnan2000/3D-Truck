'use client';

import React, { useState } from 'react';
import { QrCode, Barcode, X, Printer, Check, Copy } from 'lucide-react';
import type { LoadDto, LoadPackageDto } from '@cargoflow/shared-types';

interface BarcodeModalProps {
  load: LoadDto & { loadPackages?: LoadPackageDto[] };
  isOpen: boolean;
  onClose: () => void;
}

export function BarcodeModal({ load, isOpen, onClose }: BarcodeModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('load');

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentCode =
    selectedPackageId === 'load'
      ? load.loadNumber
      : load.loadPackages?.find((lp) => lp.id === selectedPackageId)?.packageDefinition?.packageNumber || load.loadNumber;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Cargo & Load Barcode</h2>
              <p className="text-xs text-slate-500">Scan at dock or print identification label</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center">
          {/* Target Selector */}
          <div className="w-full mb-6">
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Select Identifier</label>
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="load">Master Load Manifest ({load.loadNumber})</option>
              {load.loadPackages?.map((lp) => (
                <option key={lp.id} value={lp.id}>
                  {lp.packageDefinition?.name} ({lp.packageDefinition?.packageNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Simulated QR Code Graphic */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center shadow-inner">
            <div className="w-44 h-44 bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-center relative shadow-sm">
              {/* Scalable Vector SVG QR Representation */}
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900" fill="currentColor">
                {/* 3 Corner Finder Patterns */}
                <rect x="5" y="5" width="28" height="28" rx="4" />
                <rect x="9" y="9" width="20" height="20" rx="2" fill="white" />
                <rect x="13" y="13" width="12" height="12" rx="1" />

                <rect x="67" y="5" width="28" height="28" rx="4" />
                <rect x="71" y="9" width="20" height="20" rx="2" fill="white" />
                <rect x="75" y="13" width="12" height="12" rx="1" />

                <rect x="5" y="67" width="28" height="28" rx="4" />
                <rect x="9" y="71" width="20" height="20" rx="2" fill="white" />
                <rect x="13" y="75" width="12" height="12" rx="1" />

                {/* Simulated Data Grid */}
                <rect x="40" y="8" width="6" height="6" />
                <rect x="52" y="8" width="6" height="6" />
                <rect x="46" y="20" width="6" height="6" />
                <rect x="40" y="38" width="6" height="6" />
                <rect x="52" y="38" width="6" height="6" />
                <rect x="8" y="44" width="6" height="6" />
                <rect x="20" y="44" width="6" height="6" />
                <rect x="68" y="44" width="6" height="6" />
                <rect x="80" y="44" width="6" height="6" />
                <rect x="44" y="56" width="6" height="6" />
                <rect x="56" y="56" width="6" height="6" />
                <rect x="40" y="68" width="6" height="6" />
                <rect x="52" y="68" width="6" height="6" />
                <rect x="68" y="68" width="6" height="6" />
                <rect x="80" y="80" width="6" height="6" />
                <rect x="44" y="84" width="6" height="6" />
                <rect x="56" y="84" width="6" height="6" />
              </svg>
            </div>

            <div className="mt-4 flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800 tracking-wider">
              <Barcode className="w-4 h-4 text-slate-500" />
              <span>{currentCode}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">CargoFlow Logistics Engine</div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => handleCopy(currentCode)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Label</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


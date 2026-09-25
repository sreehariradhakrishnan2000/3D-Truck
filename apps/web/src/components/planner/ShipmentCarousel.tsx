'use client';

import React from 'react';
import type { LoadDto } from '@cargoflow/shared-types';

interface ShipmentCarouselProps {
  currentLoad: LoadDto;
}

function TruckSilhouetteIcon({ active = false }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 40"
      className={`h-7 w-auto transition-opacity ${
        active ? 'text-slate-800 opacity-90' : 'text-slate-300 opacity-50'
      }`}
      fill="currentColor"
    >
      {/* Tractor Cab Silhouette */}
      <path d="M 2 28 L 2 18 L 8 18 L 14 10 L 28 10 L 32 18 L 32 28 Z" />
      {/* Fifth Wheel & Trailer Body Silhouette */}
      <rect x="36" y="8" width="80" height="20" rx="1.5" />
      {/* Cab Wheels */}
      <circle cx="10" cy="30" r="4.5" fill="currentColor" />
      <circle cx="26" cy="30" r="4.5" fill="currentColor" />
      {/* Trailer Tandem Wheels */}
      <circle cx="94" cy="30" r="4.5" fill="currentColor" />
      <circle cx="106" cy="30" r="4.5" fill="currentColor" />
    </svg>
  );
}

export function ShipmentCarousel({ currentLoad }: ShipmentCarouselProps) {
  const currentNumber = currentLoad.loadNumber.startsWith('LOAD-')
    ? `USA-${currentLoad.loadNumber.replace('LOAD-', '146')}`
    : currentLoad.loadNumber;

  const shipments = [
    { id: '1', number: 'USA-146279BS', active: false },
    { id: '2', number: 'USA-146280BS', active: false },
    { id: '3', number: currentNumber || 'USA-146279BS', active: true },
    { id: '4', number: 'USA-146282BS', active: false },
    { id: '5', number: 'USA-146283BS', active: false },
  ];

  return (
    <div className="grid grid-cols-5 gap-3 w-full px-4 select-none">
      {shipments.map((s) => (
        <div
          key={s.id}
          className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
            s.active
              ? 'bg-white shadow-md border-2 border-purple-500/80'
              : 'bg-white/80 border border-slate-200/80 hover:bg-white'
          }`}
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-slate-400">
              Shipment number
            </span>
            <span
              className={`text-xs font-bold tracking-tight mt-0.5 ${
                s.active ? 'text-slate-900' : 'text-slate-600'
              }`}
            >
              {s.number}
            </span>
          </div>

          <div className="pl-2">
            <TruckSilhouetteIcon active={s.active} />
          </div>
        </div>
      ))}
    </div>
  );
}


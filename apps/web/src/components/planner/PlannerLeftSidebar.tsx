'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Package, Truck, Layers, PlayCircle } from 'lucide-react';

interface PlannerLeftSidebarProps {
  onToggleSimulation?: () => void;
  isSimulationActive?: boolean;
}

export function PlannerLeftSidebar({
  onToggleSimulation,
  isSimulationActive,
}: PlannerLeftSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Planner',
      href: '#',
      icon: Box,
      isActive: true,
      onClick: undefined,
    },
    {
      label: 'Packages',
      href: '/packages',
      icon: Package,
      isActive: false,
      onClick: undefined,
    },
    {
      label: 'Vehicles',
      href: '/vehicles',
      icon: Truck,
      isActive: false,
      onClick: undefined,
    },
    {
      label: 'Loads',
      href: '/loads',
      icon: Layers,
      isActive: false,
      onClick: undefined,
    },
    {
      label: 'Simulation',
      href: '#',
      icon: PlayCircle,
      isActive: isSimulationActive,
      onClick: onToggleSimulation,
    },
  ];

  return (
    <aside className="w-20 bg-white border-r border-slate-200/80 flex flex-col items-center py-4 gap-3 shrink-0 select-none">
      {navItems.map((item) => {
        const Icon = item.icon;

        if (item.onClick) {
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition ${
                item.isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition ${
              item.isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </aside>
  );
}


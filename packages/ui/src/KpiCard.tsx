import React from 'react';
import { Card } from './Card';
import { cn } from './utils';

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function KpiCard({ title, value, subtitle, icon, trend, className }: KpiCardProps) {
  return (
    <Card className={cn('flex flex-col justify-between p-5', className)} hover>
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-slate-500">{title}</span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>

      <div className="mt-3">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>

      {trend && (
        <div className="mt-2 flex items-center gap-1 text-[11px] font-medium">
          <span className={trend.isPositive ? 'text-emerald-600' : 'text-slate-500'}>
            {trend.value}
          </span>
        </div>
      )}
    </Card>
  );
}


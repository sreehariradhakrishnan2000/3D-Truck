import React from 'react';
import { cn } from './utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'blue' | 'emerald' | 'amber' | 'red' | 'slate' | 'indigo';
}

export function Badge({ className, variant = 'slate', children, ...props }: BadgeProps) {
  const variants = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200/60',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/60',
    red: 'bg-red-50 text-red-700 border-red-200/60',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-semibold tracking-wide',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}


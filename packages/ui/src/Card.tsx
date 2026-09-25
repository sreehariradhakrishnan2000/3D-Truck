import React from 'react';
import { cn } from './utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ className, hover = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-apple-sm transition-all duration-200',
        hover && 'hover:shadow-apple-md hover:border-slate-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}


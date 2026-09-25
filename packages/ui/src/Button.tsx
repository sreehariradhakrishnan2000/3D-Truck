import React from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-xl';

    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-apple-sm focus:ring-blue-500',
      secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-400',
      outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300 shadow-sm',
      danger: 'bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-400',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-300',
    };

    const sizes = {
      sm: 'px-2.5 py-1 text-xs',
      md: 'px-3.5 py-1.5 text-xs',
      lg: 'px-5 py-2.5 text-sm',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';


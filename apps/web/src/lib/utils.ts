import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(2)} t`;
  }
  return `${Math.round(kg)} kg`;
}

export function formatDimension(mm: number): string {
  if (mm >= 1000) {
    return `${(mm / 1000).toFixed(2)} m`;
  }
  return `${Math.round(mm)} mm`;
}

export function formatVolume(mm3: number): string {
  const m3 = mm3 / 1_000_000_000;
  return `${m3.toFixed(2)} m³`;
}


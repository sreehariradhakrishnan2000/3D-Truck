export type UnitSystem = 'metric' | 'imperial';

/**
 * Formats dimension in mm to appropriate unit string (mm/m or in/ft)
 */
export function formatDimension(mm: number, system: UnitSystem = 'metric', precision = 1): string {
  if (system === 'imperial') {
    const inches = mm / 25.4;
    if (inches >= 48) {
      const feet = inches / 12;
      return `${feet.toFixed(precision)} ft`;
    }
    return `${inches.toFixed(precision)} in`;
  }

  if (mm >= 1000) {
    const meters = mm / 1000;
    return `${meters.toFixed(precision)} m`;
  }
  return `${Math.round(mm)} mm`;
}

/**
 * Formats weight in kg to appropriate unit string (kg/t or lbs)
 */
export function formatWeight(kg: number, system: UnitSystem = 'metric', precision = 1): string {
  if (system === 'imperial') {
    const lbs = kg * 2.20462;
    return `${lbs.toLocaleString(undefined, { maximumFractionDigits: precision })} lbs`;
  }

  if (kg >= 1000) {
    const tons = kg / 1000;
    return `${tons.toFixed(precision)} t`;
  }
  return `${kg.toLocaleString(undefined, { maximumFractionDigits: precision })} kg`;
}

/**
 * Formats volume in mm3 to m3 or ft3
 */
export function formatVolume(mm3: number, system: UnitSystem = 'metric', precision = 2): string {
  const m3 = mm3 / 1e9;
  if (system === 'imperial') {
    const ft3 = m3 * 35.3147;
    return `${ft3.toFixed(precision)} ft³`;
  }
  return `${m3.toFixed(precision)} m³`;
}

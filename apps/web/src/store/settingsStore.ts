import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useState, useEffect } from 'react';
import type { UnitSystem } from '@/lib/units';

interface SettingsState {
  unitSystem: UnitSystem;
  toggleUnitSystem: () => void;
  setUnitSystem: (system: UnitSystem) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      unitSystem: 'metric',
      toggleUnitSystem: () =>
        set((state) => ({
          unitSystem: state.unitSystem === 'metric' ? 'imperial' : 'metric',
        })),
      setUnitSystem: (unitSystem) => set({ unitSystem }),
    }),
    {
      name: 'cargoflow-settings',
    },
  ),
);

/**
 * SSR-safe hydration gate hook for user settings.
 * Guarantees the initial render is strictly deterministic ('metric') across both server
 * and client hydration passes, preventing React #425 text content mismatch errors.
 */
export function useHydratedSettings(): {
  unitSystem: UnitSystem;
  toggleUnitSystem: () => void;
  setUnitSystem: (system: UnitSystem) => void;
  isHydrated: boolean;
} {
  const store = useSettingsStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return {
    unitSystem: hydrated ? store.unitSystem : 'metric',
    toggleUnitSystem: store.toggleUnitSystem,
    setUnitSystem: store.setUnitSystem,
    isHydrated: hydrated,
  };
}


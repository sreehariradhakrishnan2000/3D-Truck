import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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


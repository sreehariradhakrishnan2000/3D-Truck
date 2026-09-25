import { create } from 'zustand';
import type { RotationIndex, ValidationResult } from '@cargoflow/shared-types';

export interface VisualPlacement {
  id?: string;
  loadPackageId: string;
  x: number; // mm
  y: number; // mm
  z: number; // mm
  rotationIndex: RotationIndex;
  isOptimistic?: boolean;
}

interface PlannerState {
  // Active Load
  loadId: string | null;
  loadVersion: number;
  setLoad: (loadId: string, version: number) => void;
  setLoadVersion: (version: number) => void;

  // Selected item in 3D scene
  selectedLoadPackageId: string | null;
  setSelectedLoadPackageId: (id: string | null) => void;

  // Placements in scene (optimistic + confirmed)
  placements: Map<string, VisualPlacement>; // key: loadPackageId
  setPlacements: (placements: VisualPlacement[]) => void;
  updatePlacementOptimistic: (placement: VisualPlacement) => void;
  removePlacementOptimistic: (loadPackageId: string) => void;

  // View & Tool state
  viewMode: '3D' | '2D';
  setViewMode: (mode: '3D' | '2D') => void;
  cameraPreset: 'isometric' | 'top' | 'side' | 'back' | 'free';
  setCameraPreset: (preset: 'isometric' | 'top' | 'side' | 'back' | 'free') => void;
  activeTool: 'select' | 'move' | 'rotate';
  setActiveTool: (tool: 'select' | 'move' | 'rotate') => void;

  // Hovered item
  hoveredPackageId: string | null;
  setHoveredPackageId: (id: string | null) => void;

  // Conflicted/collision items
  collidingPackageIds: Set<string>;
  setCollidingPackageIds: (ids: Set<string>) => void;

  // Validation report
  validationResult: ValidationResult | null;
  setValidationResult: (res: ValidationResult | null) => void;

  // Real-time collaborator cursors/users
  activeCollaborators: Array<{ userId: string; email: string }>;
  setActiveCollaborators: (
    users:
      | Array<{ userId: string; email: string }>
      | ((prev: Array<{ userId: string; email: string }>) => Array<{ userId: string; email: string }>),
  ) => void;

  // Notification / conflict banner
  conflictMessage: string | null;
  setConflictMessage: (msg: string | null) => void;

  // Undo / Redo history
  history: VisualPlacement[][];
  future: VisualPlacement[][];
  pushSnapshot: () => void;
  undo: () => VisualPlacement[] | null;
  redo: () => VisualPlacement[] | null;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  loadId: null,
  loadVersion: 1,
  setLoad: (loadId, version) => set({ loadId, loadVersion: version }),
  setLoadVersion: (loadVersion) => set({ loadVersion }),

  selectedLoadPackageId: null,
  setSelectedLoadPackageId: (selectedLoadPackageId) => set({ selectedLoadPackageId }),

  placements: new Map(),
  setPlacements: (list) => {
    const map = new Map<string, VisualPlacement>();
    list.forEach((p) => map.set(p.loadPackageId, p));
    set({ placements: map });
  },
  updatePlacementOptimistic: (p) =>
    set((state) => {
      const next = new Map(state.placements);
      next.set(p.loadPackageId, { ...p, isOptimistic: true });
      return { placements: next };
    }),
  removePlacementOptimistic: (loadPackageId) =>
    set((state) => {
      const next = new Map(state.placements);
      next.delete(loadPackageId);
      return { placements: next, selectedLoadPackageId: null };
    }),

  viewMode: '3D',
  setViewMode: (viewMode) => set({ viewMode }),

  cameraPreset: 'isometric',
  setCameraPreset: (cameraPreset) => set({ cameraPreset }),

  activeTool: 'select',
  setActiveTool: (activeTool) => set({ activeTool }),

  hoveredPackageId: null,
  setHoveredPackageId: (hoveredPackageId) => set({ hoveredPackageId }),

  collidingPackageIds: new Set(),
  setCollidingPackageIds: (collidingPackageIds) => set({ collidingPackageIds }),

  validationResult: null,
  setValidationResult: (validationResult) => set({ validationResult }),

  activeCollaborators: [],
  setActiveCollaborators: (val) =>
    set((state) => ({
      activeCollaborators:
        typeof val === 'function' ? val(state.activeCollaborators) : val,
    })),

  conflictMessage: null,
  setConflictMessage: (conflictMessage) => set({ conflictMessage }),

  // History implementation
  history: [],
  future: [],
  pushSnapshot: () => {
    const current = Array.from(get().placements.values());
    set((state) => ({
      history: [...state.history.slice(-20), current],
      future: [],
    }));
  },
  undo: () => {
    const { history, placements } = get();
    if (history.length === 0) return null;
    const current = Array.from(placements.values());
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    const map = new Map<string, VisualPlacement>();
    previous.forEach((p) => map.set(p.loadPackageId, p));

    set((state) => ({
      placements: map,
      history: newHistory,
      future: [current, ...state.future.slice(0, 20)],
    }));
    return previous;
  },
  redo: () => {
    const { future, placements } = get();
    if (future.length === 0) return null;
    const current = Array.from(placements.values());
    const next = future[0];
    const newFuture = future.slice(1);

    const map = new Map<string, VisualPlacement>();
    next.forEach((p) => map.set(p.loadPackageId, p));

    set((state) => ({
      placements: map,
      history: [...state.history, current],
      future: newFuture,
    }));
    return next;
  },
}));


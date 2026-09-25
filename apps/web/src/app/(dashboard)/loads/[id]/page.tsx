'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronDown,
  MoreHorizontal,
  Send,
  User,
  RotateCw,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { usePlannerStore } from '@/store/plannerStore';
import { useAuthStore } from '@/store/authStore';
import { useLoadRealtime } from '@/hooks/useLoadRealtime';
import { TrailerScene } from '@/components/planner/TrailerScene';
import { ReferenceKpiPills } from '@/components/planner/ReferenceKpiPills';
import { LoadPlanningFloatingCard } from '@/components/planner/LoadPlanningFloatingCard';
import { ShipmentCarousel } from '@/components/planner/ShipmentCarousel';
import { GanttFreightTimeline } from '@/components/planner/GanttFreightTimeline';
import { SequencePlayer } from '@/components/planner/SequencePlayer';
import { AuditHistoryModal } from '@/components/planner/AuditHistoryModal';
import { BarcodeModal } from '@/components/planner/BarcodeModal';
import type {
  LoadDto,
  VehicleDto,
  LoadPackageDto,
  PackageDefinitionDto,
  ValidationResult,
  RotationIndex,
} from '@cargoflow/shared-types';

export default function LoadPlannerPage() {
  const params = useParams();
  const loadId = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const {
    loadVersion,
    setLoad,
    setLoadVersion,
    selectedLoadPackageId,
    setSelectedLoadPackageId,
    placements,
    setPlacements,
    updatePlacementOptimistic,
    removePlacementOptimistic,
    setValidationResult,
    setCollidingPackageIds,
    setConflictMessage,
    pushSnapshot,
    undo,
    redo,
    history,
    future,
  } = usePlannerStore();

  const [isPacking, setIsPacking] = useState(false);
  const [isSequenceMode, setIsSequenceMode] = useState(false);
  const [sequenceStep, setSequenceStep] = useState(1);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Real-time synchronization hook
  useLoadRealtime(loadId);

  // Fetch Load with Vehicle, LoadPackages, Placements
  const { data: load, isLoading: isLoadLoading } = useQuery({
    queryKey: ['load', loadId],
    queryFn: () =>
      api.get<LoadDto & { loadPackages: LoadPackageDto[]; vehicle: VehicleDto }>(
        `/loads/${loadId}`
      ),
  });

  // Fetch Package Catalog for adding items
  const { data: packageDefinitions = [] } = useQuery({
    queryKey: ['package-definitions'],
    queryFn: () => api.get<PackageDefinitionDto[]>('/package-definitions'),
  });

  // Fetch Loading Sequence
  const { data: sequence = [] } = useQuery({
    queryKey: ['load-sequence', loadId],
    queryFn: () => api.get<any[]>(`/loads/${loadId}/sequence`),
  });

  // Sync Load state with Planner Store
  useEffect(() => {
    if (load) {
      setLoad(load.id, load.version);
      if (load.loadPackages) {
        const visualPlacements = load.loadPackages
          .filter((lp) => lp.placements && lp.placements.length > 0)
          .map((lp) => ({
            id: lp.placements[0].id,
            loadPackageId: lp.id,
            x: lp.placements[0].x,
            y: lp.placements[0].y,
            z: lp.placements[0].z,
            rotationIndex: lp.placements[0].rotationIndex as RotationIndex,
          }));
        setPlacements(visualPlacements);
      }
    }
  }, [load, setLoad, setPlacements]);

  // Validation Query
  const fetchValidation = useCallback(async () => {
    if (!loadId) return;
    try {
      const res = await api.get<ValidationResult>(`/loads/${loadId}/validation`);
      setValidationResult(res);

      const colliding = new Set<string>();
      res.issues.forEach((issue) => {
        if (issue.packageId) colliding.add(issue.packageId);
        if (issue.conflictingPackageId) colliding.add(issue.conflictingPackageId);
      });
      setCollidingPackageIds(colliding);
    } catch {
      // Ignore
    }
  }, [loadId, setValidationResult, setCollidingPackageIds]);

  useEffect(() => {
    if (load) fetchValidation();
  }, [load, fetchValidation]);

  // Auto-play loading sequence animation
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlayingSequence && isSequenceMode && sequence.length > 0) {
      interval = setInterval(() => {
        setSequenceStep((prev) => {
          if (prev >= sequence.length) {
            setIsPlayingSequence(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingSequence, isSequenceMode, sequence.length]);

  // Mutation: Place or Move Package
  const placeMutation = useMutation({
    mutationFn: (dto: {
      loadPackageId: string;
      x: number;
      y: number;
      z: number;
      rotationIndex: number;
    }) =>
      api.post(`/loads/${loadId}/placements`, {
        ...dto,
        loadVersion,
      }),
    onMutate: async (newPlacement) => {
      updatePlacementOptimistic({
        loadPackageId: newPlacement.loadPackageId,
        x: newPlacement.x,
        y: newPlacement.y,
        z: newPlacement.z,
        rotationIndex: newPlacement.rotationIndex as RotationIndex,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['load', loadId] });
      queryClient.invalidateQueries({ queryKey: ['load-sequence', loadId] });
      setLoadVersion(loadVersion + 1);
      fetchValidation();
    },
    onError: (err: any) => {
      if (err?.code === 'STALE_LOAD_VERSION' || err?.code === 'LOAD_CONFLICT') {
        setConflictMessage(
          'Version conflict detected: Another user modified this load. Synchronizing state...'
        );
      } else {
        setConflictMessage(err?.message || 'Placement validation failed.');
      }
      queryClient.invalidateQueries({ queryKey: ['load', loadId] });
    },
  });

  // Mutation: Remove Placement
  const removePlacementMutation = useMutation({
    mutationFn: (placementId: string) =>
      api.delete(`/loads/${loadId}/placements/${placementId}?loadVersion=${loadVersion}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['load', loadId] });
      queryClient.invalidateQueries({ queryKey: ['load-sequence', loadId] });
      setLoadVersion(loadVersion + 1);
      fetchValidation();
    },
  });

  // Handler: Rotate Selected Package
  const handleRotateSelected = () => {
    if (!selectedLoadPackageId) return;
    const current = placements.get(selectedLoadPackageId);
    if (!current) return;

    pushSnapshot();
    const nextRotation = ((current.rotationIndex + 1) % 6) as RotationIndex;
    placeMutation.mutate({
      loadPackageId: selectedLoadPackageId,
      x: current.x,
      y: current.y,
      z: current.z,
      rotationIndex: nextRotation,
    });
  };

  // Handler: Remove Selected Placement
  const handleRemoveSelected = () => {
    if (!selectedLoadPackageId) return;
    const current = placements.get(selectedLoadPackageId);
    if (!current) return;

    pushSnapshot();
    if (current.id) {
      removePlacementMutation.mutate(current.id);
    }
    removePlacementOptimistic(selectedLoadPackageId);
  };

  // Handler: Clear All Placements in Plan
  const handleClearPlan = async () => {
    if (!load?.loadPackages) return;
    pushSnapshot();
    for (const lp of load.loadPackages) {
      if (lp.placements && lp.placements.length > 0) {
        removePlacementMutation.mutate(lp.placements[0].id);
      }
    }
  };

  // Handler: Trigger Backend Auto-Pack with Loading Sequence
  const handleAutoPack = async () => {
    pushSnapshot();
    setIsPacking(true);
    try {
      await api.post(`/loads/${loadId}/auto-pack`, { strategy: 'GREEDY' });
      await queryClient.invalidateQueries({ queryKey: ['load', loadId] });
      await queryClient.invalidateQueries({ queryKey: ['load-sequence', loadId] });
      await queryClient.invalidateQueries({ queryKey: ['load-audit-logs', loadId] });
      fetchValidation();
      setSequenceStep(1);
    } catch (err: any) {
      setConflictMessage(err?.message || 'Auto-packing encountered an error.');
    } finally {
      setIsPacking(false);
    }
  };

  // Keyboard shortcut listener (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        fetchValidation();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
        fetchValidation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, fetchValidation]);

  if (isLoadLoading || !load) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Loading 3D workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-900 flex flex-col pb-8">
      {/* ══════════════════════════════════════════════════════════
          1. PAGE HEADER & CONTEXT
          ══════════════════════════════════════════════════════════ */}
      <div className="w-full px-6 pt-4 pb-2 flex items-center justify-between border-b border-slate-200/60 bg-white/70 backdrop-blur-sm sticky top-16 z-30">
        {/* Left: Back Arrow & Page Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/loads"
            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            title="Back to Loads"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Trucks Management
            </h1>
            <p className="text-xs text-slate-400">
              This page shows recent dispatcher activity
            </p>
          </div>
        </div>

        {/* Center: KPI Pills (Weight, Pallets, Alerts) */}
        <ReferenceKpiPills load={load} />

        {/* Right: Dispatcher Profile & Resend Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50">
            <span className="text-slate-400 text-[11px]">🔒</span>
            <span className="font-medium">
              Dispatcher: {user?.email ? user.email.split('@')[0] : 'John Freightman'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>

          <button
            onClick={() => alert('Load plan instructions resent to vehicle driver tablet.')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-sm hover:bg-slate-800 transition"
          >
            <span>Resent to driver</span>
          </button>

          <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          2. MAIN 3D SHOWCASE VIEWPORT & FLOATING LOAD PLANNING CARD
          ══════════════════════════════════════════════════════════ */}
      <div className="relative w-full h-[520px] bg-[#f8fafc] overflow-hidden my-2">
        {/* 3D Canvas Scene */}
        <TrailerScene
          vehicle={load.vehicle}
          loadPackages={load.loadPackages || []}
          sequenceItems={sequence}
          visibleStep={isSequenceMode ? sequenceStep : null}
        />

        {/* Floating Right Glassmorphic Card (1:1 with reference) */}
        <div className="absolute top-4 right-6 z-20 pointer-events-auto">
          <LoadPlanningFloatingCard
            loadPackages={load.loadPackages || []}
            vehicle={load.vehicle}
            onAutoPack={handleAutoPack}
            onClearPlan={handleClearPlan}
            onOpenBarcode={() => setIsBarcodeModalOpen(true)}
            onOpenAuditHistory={() => setIsAuditModalOpen(true)}
            onRotateSelected={handleRotateSelected}
            isPacking={isPacking}
          />
        </div>

        {/* Loading Sequence Simulation Floating Stepper */}
        {isSequenceMode && sequence.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
            <SequencePlayer
              currentStep={sequenceStep}
              totalSteps={sequence.length}
              isPlaying={isPlayingSequence}
              onNext={() => setSequenceStep((s) => Math.min(sequence.length, s + 1))}
              onPrev={() => setSequenceStep((s) => Math.max(1, s - 1))}
              onTogglePlay={() => setIsPlayingSequence(!isPlayingSequence)}
              onReset={() => {
                setIsPlayingSequence(false);
                setSequenceStep(1);
              }}
            />
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          3. HORIZONTAL SHIPMENT SELECTOR CAROUSEL
          ══════════════════════════════════════════════════════════ */}
      <div className="my-2">
        <ShipmentCarousel currentLoad={load} />
      </div>

      {/* ══════════════════════════════════════════════════════════
          4. BOTTOM FREIGHT UNITS & GANTT TIMELINE SCHEDULE
          ══════════════════════════════════════════════════════════ */}
      <div className="my-2">
        <GanttFreightTimeline loadPackages={load.loadPackages || []} />
      </div>

      {/* ══════════════════════════════════════════════════════════
          5. MODALS (Audit History & Barcode)
          ══════════════════════════════════════════════════════════ */}
      <AuditHistoryModal
        loadId={loadId}
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

      <BarcodeModal
        load={load}
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
      />
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePlannerStore } from '@/store/plannerStore';
import { useLoadRealtime } from '@/hooks/useLoadRealtime';
import { TrailerScene } from '@/components/planner/TrailerScene';
import { TwoDPlannerFallback } from '@/components/planner/TwoDPlannerFallback';
import { PlannerControls } from '@/components/planner/PlannerControls';
import { CargoTray } from '@/components/planner/CargoTray';
import { ValidationPanel } from '@/components/planner/ValidationPanel';
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
  const queryClient = useQueryClient();

  const {
    loadVersion,
    setLoad,
    setLoadVersion,
    viewMode,
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
    queryFn: () => api.get<LoadDto & { loadPackages: LoadPackageDto[]; vehicle: VehicleDto }>(`/loads/${loadId}`),
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
    mutationFn: (dto: { loadPackageId: string; x: number; y: number; z: number; rotationIndex: number }) =>
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
        setConflictMessage('Version conflict detected: Another user modified this load. Synchronizing state...');
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

  // Mutation: Add Package to Load
  const addPackageMutation = useMutation({
    mutationFn: (vars: { packageDefinitionId: string; quantity: number }) =>
      api.post(`/loads/${loadId}/packages`, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['load', loadId] });
    },
  });

  // Handler: Place Next Unplaced Item
  const handleQuickPlace = (loadPackageId: string) => {
    if (!load?.vehicle) return;
    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;

    const existing = Array.from(placements.values());
    if (existing.length > 0) {
      const last = existing[existing.length - 1];
      targetX = last.x + 1200;
      if (targetX + 1200 > load.vehicle.interiorLength) {
        targetX = 0;
        targetY = (last.y + 800) % load.vehicle.interiorWidth;
      }
    }

    placeMutation.mutate({
      loadPackageId,
      x: targetX,
      y: targetY,
      z: targetZ,
      rotationIndex: 0,
    });
  };

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

  // Handler: Fine-grained Nudge Selected Package in 3D
  const handleNudgePackage = (pkgId: string, dx: number, dy: number, dz: number) => {
    const current = placements.get(pkgId);
    if (!current || !load?.vehicle) return;

    pushSnapshot();
    const newX = Math.max(0, Math.min(load.vehicle.interiorLength - 100, current.x + dx));
    const newY = Math.max(0, Math.min(load.vehicle.interiorWidth - 100, current.y + dy));
    const newZ = Math.max(0, Math.min(load.vehicle.interiorHeight - 100, current.z + dz));

    placeMutation.mutate({
      loadPackageId: pkgId,
      x: newX,
      y: newY,
      z: newZ,
      rotationIndex: current.rotationIndex,
    });
  };

  // Undo / Redo Handlers
  const handleUndo = useCallback(() => {
    const previous = undo();
    if (previous) {
      fetchValidation();
    }
  }, [undo, fetchValidation]);

  const handleRedo = useCallback(() => {
    const next = redo();
    if (next) {
      fetchValidation();
    }
  }, [redo, fetchValidation]);

  // Keyboard shortcut listener (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

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

  if (isLoadLoading || !load) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Loading 3D workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-900">
      {/* Left Cargo Tray */}
      <CargoTray
        loadPackages={load.loadPackages || []}
        packageDefinitions={packageDefinitions}
        onAddPackage={(packageDefinitionId, quantity) =>
          addPackageMutation.mutate({ packageDefinitionId, quantity })
        }
        onPlacePackage={handleQuickPlace}
        onNudgePackage={handleNudgePackage}
        onRotatePackage={handleRotateSelected}
        onRemovePlacement={handleRemoveSelected}
      />

      {/* Center 3D Viewport / 2D Fallback */}
      <div className="relative flex-1 h-full overflow-hidden">
        <PlannerControls
          loadId={loadId}
          onAutoPack={handleAutoPack}
          onRotateSelected={handleRotateSelected}
          onRemoveSelected={handleRemoveSelected}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={history.length > 0}
          canRedo={future.length > 0}
          onOpenAuditLogs={() => setIsAuditModalOpen(true)}
          onOpenBarcode={() => setIsBarcodeModalOpen(true)}
          isPacking={isPacking}
          isSequenceMode={isSequenceMode}
          onToggleSequence={() => {
            setIsSequenceMode(!isSequenceMode);
            setIsPlayingSequence(false);
            setSequenceStep(sequence.length || 1);
          }}
        />

        {viewMode === '3D' ? (
          <TrailerScene
            vehicle={load.vehicle}
            loadPackages={load.loadPackages || []}
            sequenceItems={sequence}
            visibleStep={isSequenceMode ? sequenceStep : null}
          />
        ) : (
          <TwoDPlannerFallback vehicle={load.vehicle} loadPackages={load.loadPackages || []} />
        )}

        {/* Loading Sequence Stepper Controls */}
        {isSequenceMode && sequence.length > 0 && (
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
        )}
      </div>

      {/* Right Validation Diagnostics Panel */}
      <ValidationPanel load={load} vehicle={load.vehicle} />

      {/* Audit History Timeline Modal */}
      <AuditHistoryModal
        loadId={loadId}
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

      {/* Barcode / QR Identification Modal */}
      <BarcodeModal
        load={load}
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
      />
    </div>
  );
}

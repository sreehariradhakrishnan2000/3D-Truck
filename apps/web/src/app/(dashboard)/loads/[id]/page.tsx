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
import { runPackingEngine } from '@cargoflow/packing-engine';
import type {
  LoadDto,
  VehicleDto,
  LoadPackageDto,
  PackageDefinitionDto,
  ValidationResult,
  RotationIndex,
  PackingPackage,
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
  } = usePlannerStore();

  const [isPacking, setIsPacking] = useState(false);

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

      // Collect colliding IDs
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
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['load', loadId] });
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
    // Simple initial heuristic: place next to existing or at floor origin
    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;

    const existing = Array.from(placements.values());
    if (existing.length > 0) {
      const last = existing[existing.length - 1];
      targetX = last.x + 1200; // Place downstream along length
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

    if (current.id) {
      removePlacementMutation.mutate(current.id);
    }
    removePlacementOptimistic(selectedLoadPackageId);
  };

  // Handler: Auto-Pack with Greedy Engine
  const handleAutoPack = async () => {
    if (!load?.vehicle || !load.loadPackages) return;
    setIsPacking(true);

    try {
      const packingPackages: PackingPackage[] = load.loadPackages.map((lp) => ({
        loadPackageId: lp.id,
        packageDefinitionId: lp.packageDefinitionId,
        length: lp.packageDefinition?.length || 1000,
        width: lp.packageDefinition?.width || 1000,
        height: lp.packageDefinition?.height || 1000,
        weightKg: lp.packageDefinition?.weightKg || 100,
        isFragile: lp.packageDefinition?.isFragile || false,
        isStackable: lp.packageDefinition?.isStackable ?? true,
        requiresUprightOrientation: lp.packageDefinition?.requiresUprightOrientation || false,
        requiresFloorSupport: lp.packageDefinition?.requiresFloorSupport || false,
        allowedRotations: (lp.packageDefinition?.allowedRotations as RotationIndex[]) || [0, 2],
        priority: lp.priority || 5,
      }));

      const result = runPackingEngine({
        loadId,
        vehicleId: load.vehicle.id,
        trailer: {
          interiorLength: load.vehicle.interiorLength,
          interiorWidth: load.vehicle.interiorWidth,
          interiorHeight: load.vehicle.interiorHeight,
          doorWidth: load.vehicle.doorWidth,
          doorHeight: load.vehicle.doorHeight,
          maxPayloadKg: load.vehicle.maxPayloadKg,
        },
        packages: packingPackages,
      });

      // Commit placements sequentially with server validation
      for (const p of result.placements) {
        await api.post(`/loads/${loadId}/placements`, {
          loadPackageId: p.loadPackageId,
          x: p.x,
          y: p.y,
          z: p.z,
          rotationIndex: p.rotationIndex,
          loadVersion,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['load', loadId] });
      fetchValidation();
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
      />

      {/* Center 3D Viewport / 2D Fallback */}
      <div className="relative flex-1 h-full overflow-hidden">
        <PlannerControls
          onAutoPack={handleAutoPack}
          onRotateSelected={handleRotateSelected}
          onRemoveSelected={handleRemoveSelected}
          isPacking={isPacking}
        />

        {viewMode === '3D' ? (
          <TrailerScene vehicle={load.vehicle} loadPackages={load.loadPackages || []} />
        ) : (
          <TwoDPlannerFallback vehicle={load.vehicle} loadPackages={load.loadPackages || []} />
        )}
      </div>

      {/* Right Validation Diagnostics Panel */}
      <ValidationPanel load={load} vehicle={load.vehicle} />
    </div>
  );
}


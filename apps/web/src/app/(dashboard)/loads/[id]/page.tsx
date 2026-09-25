'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  Bell,
  Sparkles,
  Save,
  Box,
} from 'lucide-react';
import { api } from '@/lib/api';
import { usePlannerStore } from '@/store/plannerStore';
import { useAuthStore } from '@/store/authStore';
import { useLoadRealtime } from '@/hooks/useLoadRealtime';
import { TrailerScene } from '@/components/planner/TrailerScene';
import { PlannerLeftSidebar } from '@/components/planner/PlannerLeftSidebar';
import { PlannerMetricCards } from '@/components/planner/PlannerMetricCards';
import { PackageListPanel } from '@/components/planner/PackageListPanel';
import { PlannerBottomPanels } from '@/components/planner/PlannerBottomPanels';
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
  } = usePlannerStore();

  const [isPacking, setIsPacking] = useState(false);
  const [isSequenceMode, setIsSequenceMode] = useState(false);
  const [sequenceStep, setSequenceStep] = useState(1);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Display & Camera state toggles
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showCenterOfGravity, setShowCenterOfGravity] = useState(true);
  const [transparentWalls, setTransparentWalls] = useState(true);
  const [lightingMode, setLightingMode] = useState<'light' | 'dark' | 'studio'>('light');
  const [is3DExpanded, setIs3DExpanded] = useState(false);

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

  // Fetch Package Catalog
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

  // Handler: Trigger Backend Auto-Pack (Optimize Load)
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
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Loading 3D workspace...</p>
        </div>
      </div>
    );
  }

  const loadNumberDisplay = load.loadNumber.startsWith('LOAD-')
    ? `#R-${load.loadNumber.replace('LOAD-', '1122')}`
    : `#${load.loadNumber}`;

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-900 flex flex-col">
      {/* ══════════════════════════════════════════════════════════
          1. TOP APP HEADER BAR (Matching Reference Image)
          ══════════════════════════════════════════════════════════ */}
      <header className="h-16 px-6 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-30 select-none">
        {/* Left: Brand & Load Selector */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <Box className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              CargoFlow
            </span>
          </Link>

          {/* Load Plan Selector Dropdown */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition cursor-pointer">
            <span>Load Plan {loadNumberDisplay}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Status Badge */}
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
            {load.status === 'DRAFT' ? 'Planning' : load.status}
          </span>
        </div>

        {/* Right: User Avatar, Notification, Save & Optimize Buttons */}
        <div className="flex items-center gap-3">
          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
            {user?.email ? user.email.slice(0, 2).toUpperCase() : 'JD'}
          </div>

          {/* Notification Bell */}
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition">
            <Bell className="h-4 w-4" />
          </button>

          {/* Save Button */}
          <button
            onClick={() => alert('Load plan saved successfully.')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Save className="h-3.5 w-3.5 text-slate-500" />
            <span>Save</span>
          </button>

          {/* Optimize Load Button (Auto-pack) */}
          <button
            onClick={handleAutoPack}
            disabled={isPacking}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isPacking ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>Optimize Load</span>
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          2. WORKSPACE BODY: LEFT SIDEBAR + MAIN CONTENT AREA
          ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <PlannerLeftSidebar
          isSimulationActive={isSequenceMode}
          onToggleSimulation={() => {
            setIsSequenceMode(!isSequenceMode);
            setIsPlayingSequence(false);
            setSequenceStep(sequence.length || 1);
          }}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Top 4 KPI Metric Cards */}
          <PlannerMetricCards load={load} vehicle={load.vehicle} />

          {/* ── 3D SHOWCASE VIEWPORT & PACKAGE LIST PANEL ── */}
          <div className="grid grid-cols-12 gap-4">
            {/* Center 3D Viewport (Expansive & Prominent) */}
            <div
              className={`bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden h-[660px] relative transition-all duration-300 ${
                is3DExpanded ? 'col-span-12' : 'col-span-12 xl:col-span-9'
              }`}
            >
              <TrailerScene
                vehicle={load.vehicle}
                loadPackages={load.loadPackages || []}
                sequenceItems={sequence}
                visibleStep={isSequenceMode ? sequenceStep : null}
                showGrid={showGrid}
                showLabels={showLabels}
                showDimensions={showDimensions}
                showCenterOfGravity={showCenterOfGravity}
                transparentWalls={transparentWalls}
                lightingMode={lightingMode}
                onRotateSelected={handleRotateSelected}
              />

              {/* Floating Full-Width / Maximize 3D Toggle */}
              <div className="absolute top-4 right-4 z-20 pointer-events-auto">
                <button
                  onClick={() => setIs3DExpanded(!is3DExpanded)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition"
                  title={is3DExpanded ? 'Restore Package List' : 'Maximize 3D Workspace'}
                >
                  <span>{is3DExpanded ? 'Show List' : 'Maximize 3D'}</span>
                </button>
              </div>

              {/* Loading Sequence Stepper Controls (When simulation is toggled) */}
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

            {/* Right Package List Panel (Collapsible) */}
            {!is3DExpanded && (
              <div className="col-span-12 xl:col-span-3 h-[660px]">
                <PackageListPanel
                  loadPackages={load.loadPackages || []}
                  onClose={() => setIs3DExpanded(true)}
                />
              </div>
            )}
          </div>

          {/* ── BOTTOM 3 PANELS: Selected Package, Trailer Info, Camera & Display ── */}
          <PlannerBottomPanels
            loadPackages={load.loadPackages || []}
            vehicle={load.vehicle}
            showGrid={showGrid}
            setShowGrid={setShowGrid}
            showLabels={showLabels}
            setShowLabels={setShowLabels}
            showDimensions={showDimensions}
            setShowDimensions={setShowDimensions}
            showCenterOfGravity={showCenterOfGravity}
            setShowCenterOfGravity={setShowCenterOfGravity}
            transparentWalls={transparentWalls}
            setTransparentWalls={setTransparentWalls}
            lightingMode={lightingMode}
            setLightingMode={setLightingMode}
          />
        </main>
      </div>

      {/* ── AUDIT HISTORY & BARCODE MODALS ── */}
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

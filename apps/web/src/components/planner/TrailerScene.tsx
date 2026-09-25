'use client';

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import {
  MousePointer2,
  Move,
  RotateCw,
  Ruler,
  EyeOff,
  Maximize2,
  RotateCcw,
  Box,
  Layers,
  Truck,
} from 'lucide-react';
import { Package3D } from './Package3D';
import { TruckCabin3D } from './TruckCabin3D';
import { TrailerChassis3D } from './TrailerChassis3D';
import { usePlannerStore } from '@/store/plannerStore';
import type { VehicleDto, LoadPackageDto } from '@cargoflow/shared-types';

interface TrailerSceneProps {
  vehicle: VehicleDto;
  loadPackages: LoadPackageDto[];
  sequenceItems?: any[];
  visibleStep?: number | null;
  showGrid?: boolean;
  showLabels?: boolean;
  showDimensions?: boolean;
  showCenterOfGravity?: boolean;
  transparentWalls?: boolean;
  lightingMode?: 'light' | 'dark' | 'studio';
  onRotateSelected?: () => void;
}

const TRAILER_FLOOR_Y = 1.02; // meters above ground where wheels touch

function CenterOfGravityMarker({ floorY, trailerHeight }: { floorY: number; trailerHeight: number }) {
  const { validationResult } = usePlannerStore();
  const cog = validationResult?.weightDistribution?.centerOfGravity;
  if (!cog || (cog.x === 0 && cog.y === 0)) return null;

  // Scale mm to scene meters (with floorY elevation offset)
  const x = cog.x / 1000;
  const y = floorY + (cog.z || 100) / 1000;
  const z = cog.y / 1000;

  return (
    <group position={[x, y, z]}>
      <mesh>
        <sphereGeometry args={[0.15, 24, 24]} />
        <meshStandardMaterial color="#8b5cf6" roughness={0.2} emissive="#7c3aed" emissiveIntensity={0.8} />
      </mesh>
      {/* Target line down to trailer floor */}
      <lineSegments>
        <bufferGeometry
          attach="geometry"
          {...new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, -(cog.z || 100) / 1000, 0),
          ])}
        />
        <lineDashedMaterial color="#8b5cf6" dashSize={0.1} gapSize={0.05} />
      </lineSegments>
    </group>
  );
}

export function TrailerScene({
  vehicle,
  loadPackages,
  sequenceItems,
  visibleStep,
  showGrid = true,
  showLabels = true,
  showDimensions = true,
  showCenterOfGravity = true,
  transparentWalls = true,
  lightingMode = 'light',
  onRotateSelected,
}: TrailerSceneProps) {
  const { placements, setSelectedLoadPackageId, selectedLoadPackageId } = usePlannerStore();
  const controlsRef = useRef<any>(null);

  const [activeTool, setActiveTool] = useState<'select' | 'move' | 'rotate' | 'measure'>('select');
  const [internalHideWalls, setInternalHideWalls] = useState(false);
  const [currentCameraView, setCurrentCameraView] = useState<'3d' | 'top' | 'side' | 'front' | 'rear'>('3d');

  const L = vehicle.interiorLength / 1000;
  const W = vehicle.interiorWidth / 1000;
  const H = vehicle.interiorHeight / 1000;

  // Target center for camera orbit: centered along the full truck (cab + trailer)
  const targetX = (L - 4.5) / 2;
  const targetY = TRAILER_FLOOR_Y + H / 2;
  const targetZ = W / 2;

  // Set Camera View Angles
  const setCameraView = (view: '3d' | 'top' | 'side' | 'front' | 'rear') => {
    setCurrentCameraView(view);
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const camera = controls.object;

    if (view === '3d') {
      camera.position.set(targetX + 6, targetY + H * 1.8, targetZ + W * 3.6);
      controls.target.set(targetX + 2, targetY, targetZ);
    } else if (view === 'top') {
      camera.position.set(targetX + 2, targetY + H * 4.2, targetZ);
      controls.target.set(targetX + 2, targetY, targetZ);
    } else if (view === 'side') {
      camera.position.set(targetX + 2, targetY, targetZ + W * 4.2);
      controls.target.set(targetX + 2, targetY, targetZ);
    } else if (view === 'front') {
      camera.position.set(-8.5, targetY + H * 0.4, targetZ);
      controls.target.set(targetX - 2, targetY, targetZ);
    } else if (view === 'rear') {
      camera.position.set(L + 7.5, targetY + H * 0.4, targetZ);
      controls.target.set(targetX + 4, targetY, targetZ);
    }

    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
  };

  // Placed packages lookup
  const placedItems = useMemo(() => {
    const list: Array<{
      pkg: LoadPackageDto;
      placement: { x: number; y: number; z: number; rotationIndex: any };
    }> = [];

    loadPackages.forEach((lp) => {
      const placement = placements.get(lp.id);
      if (placement) {
        list.push({ pkg: lp, placement });
      } else if (lp.placements && lp.placements.length > 0) {
        list.push({ pkg: lp, placement: lp.placements[0] });
      }
    });

    if (visibleStep !== undefined && visibleStep !== null && sequenceItems && sequenceItems.length > 0) {
      const allowedPackageIds = new Set(
        sequenceItems
          .filter((s) => s.sequenceOrder <= visibleStep)
          .map((s) => s.loadPackageId)
      );
      return list.filter((item) => allowedPackageIds.has(item.pkg.id));
    }

    return list;
  }, [loadPackages, placements, visibleStep, sequenceItems]);

  const backgroundColor = useMemo(() => {
    if (lightingMode === 'dark') return '#0f172a';
    if (lightingMode === 'studio') return '#e2e8f0';
    return '#f8fafc'; // light
  }, [lightingMode]);

  return (
    <div
      className="relative h-full w-full select-none"
      style={{ backgroundColor }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedLoadPackageId(null);
        }
      }}
    >
      {/* ── TOP FLOATING ACTION TOOLBAR (Matching Reference UI) ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80 pointer-events-auto">
        {/* Select Tool */}
        <button
          onClick={() => setActiveTool('select')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTool === 'select'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MousePointer2 className="h-3.5 w-3.5" />
          <span>Select</span>
        </button>

        {/* Move Tool */}
        <button
          onClick={() => setActiveTool('move')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTool === 'move'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Move className="h-3.5 w-3.5" />
          <span>Move</span>
        </button>

        {/* Rotate Tool */}
        <button
          onClick={() => {
            setActiveTool('rotate');
            if (onRotateSelected) onRotateSelected();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTool === 'rotate'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Rotate</span>
        </button>

        {/* Measure Tool */}
        <button
          onClick={() => setActiveTool('measure')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTool === 'measure'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Ruler className="h-3.5 w-3.5" />
          <span>Measure</span>
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Hide Walls Toggle */}
        <button
          onClick={() => setInternalHideWalls(!internalHideWalls)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            internalHideWalls
              ? 'bg-purple-100 text-purple-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Toggle Transparent / Cutaway Walls"
        >
          <EyeOff className="h-3.5 w-3.5" />
          <span>Hide Walls</span>
        </button>

        {/* Fit View */}
        <button
          onClick={() => setCameraView('3d')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          title="Fit View"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span>Fit View</span>
        </button>

        {/* Reset */}
        <button
          onClick={() => setCameraView('3d')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          title="Reset Camera"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* ── RIGHT FLOATING CAMERA PRESET CONTROLS (Matching Reference UI) ── */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 p-1.5 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80 pointer-events-auto">
        {/* 3D View */}
        <button
          onClick={() => setCameraView('3d')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold transition ${
            currentCameraView === '3d'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Box className="h-4 w-4 mb-0.5" />
          <span>3D View</span>
        </button>

        {/* Top View */}
        <button
          onClick={() => setCameraView('top')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold transition ${
            currentCameraView === 'top'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="h-4 w-4 mb-0.5" />
          <span>Top View</span>
        </button>

        {/* Side View */}
        <button
          onClick={() => setCameraView('side')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold transition ${
            currentCameraView === 'side'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="h-4 w-4 mb-0.5" />
          <span>Side View</span>
        </button>

        {/* Front View */}
        <button
          onClick={() => setCameraView('front')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold transition ${
            currentCameraView === 'front'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-xs font-bold leading-none mb-0.5">FRONT</span>
          <span>Front View</span>
        </button>

        {/* Rear View */}
        <button
          onClick={() => setCameraView('rear')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold transition ${
            currentCameraView === 'rear'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-xs font-bold leading-none mb-0.5">REAR</span>
          <span>Rear View</span>
        </button>
      </div>

      {/* ── MAIN THREE.JS 3D CANVAS ── */}
      <Canvas shadows gl={{ antialias: true, alpha: true }}>
        {/* Cinematic 3/4 Perspective Camera */}
        <PerspectiveCamera
          makeDefault
          position={[targetX + 6, targetY + H * 1.8, targetZ + W * 3.6]}
          fov={36}
        />

        {/* OrbitControls: 360-degree rotation all around, clamped only at ground level */}
        <OrbitControls
          ref={controlsRef}
          target={[targetX + 2, targetY, targetZ]}
          maxPolarAngle={Math.PI / 2 - 0.02} // Ground clamp prevents going under floor
          minPolarAngle={0.05} // Allows looking directly down from above
          minDistance={3}
          maxDistance={45}
          enableDamping
          dampingFactor={0.08}
        />

        {/* Studio Lighting */}
        <ambientLight intensity={lightingMode === 'dark' ? 0.4 : 1.1} />
        <directionalLight
          position={[-8, 18, 14]}
          intensity={lightingMode === 'dark' ? 0.8 : 1.3}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={45}
          shadow-camera-left={-18}
          shadow-camera-right={22}
          shadow-camera-top={16}
          shadow-camera-bottom={-5}
        />
        <directionalLight position={[14, 12, 8]} intensity={0.6} />
        <directionalLight position={[targetX, -5, -12]} intensity={0.25} />

        {/* Floor Grid (when enabled) */}
        {showGrid && (
          <gridHelper
            args={[Math.max(L * 1.5, 30), 40, '#94a3b8', '#cbd5e1']}
            position={[targetX + 2, 0.005, targetZ]}
          />
        )}

        {/* ── 1. MODERN WHITE SEMI-TRUCK TRACTOR CAB (Attached at X <= 0) ── */}
        <TruckCabin3D trailerWidth={W} />

        {/* ── 2. SEE-THROUGH CUTAWAY TRAILER CHASSIS & RUNNING GEAR ── */}
        <TrailerChassis3D
          vehicle={vehicle}
          floorY={TRAILER_FLOOR_Y}
          transparentWalls={transparentWalls || internalHideWalls}
        />

        {/* ── 3. REALISTIC MULTI-MATERIAL PACKAGES ── */}
        <group position={[0, TRAILER_FLOOR_Y, 0]}>
          {placedItems.map(({ pkg, placement }) => (
            <Package3D
              key={pkg.id}
              id={pkg.id}
              name={pkg.packageDefinition?.name || 'Package'}
              dims={{
                length: pkg.packageDefinition?.length || 1000,
                width: pkg.packageDefinition?.width || 1000,
                height: pkg.packageDefinition?.height || 1000,
              }}
              position={{ x: placement.x, y: placement.y, z: placement.z }}
              rotationIndex={placement.rotationIndex}
              isFragile={pkg.packageDefinition?.isFragile}
              isHazardous={pkg.packageDefinition?.isHazardous}
              weightKg={pkg.packageDefinition?.weightKg || 500}
              routingTag={pkg.packageDefinition?.sku || `PKG-${pkg.id.slice(0, 4)}`}
              showLabels={showLabels}
            />
          ))}
        </group>

        {/* Center of Gravity Marker (when enabled) */}
        {showCenterOfGravity && (
          <CenterOfGravityMarker floorY={TRAILER_FLOOR_Y} trailerHeight={H} />
        )}

        {/* Realistic Ground Contact Shadows */}
        <ContactShadows
          position={[targetX + 2, 0.01, targetZ]}
          opacity={0.6}
          scale={L + 14}
          blur={1.8}
          far={3}
          resolution={1024}
          color="#0f172a"
        />
      </Canvas>
    </div>
  );
}

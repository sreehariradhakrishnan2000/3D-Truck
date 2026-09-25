'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
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
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshStandardMaterial color="#8b5cf6" roughness={0.2} emissive="#7c3aed" emissiveIntensity={0.6} />
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

export function TrailerScene({ vehicle, loadPackages, sequenceItems, visibleStep }: TrailerSceneProps) {
  const { cameraPreset, placements, setSelectedLoadPackageId } = usePlannerStore();
  const controlsRef = useRef<any>(null);

  const L = vehicle.interiorLength / 1000;
  const W = vehicle.interiorWidth / 1000;
  const H = vehicle.interiorHeight / 1000;

  // Target center for camera orbit: centered along the full truck (cab + trailer)
  const targetX = (L - 4.5) / 2;
  const targetY = TRAILER_FLOOR_Y + H / 2;
  const targetZ = W / 2;

  // Camera presets
  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    if (cameraPreset === 'isometric') {
      controls.object.position.set(targetX - 2, targetY + H * 0.9, W * 3.8);
      controls.target.set(targetX, targetY, targetZ);
    } else if (cameraPreset === 'top') {
      controls.object.position.set(targetX, targetY + H * 3.6, targetZ);
      controls.target.set(targetX, targetY, targetZ);
    } else if (cameraPreset === 'side') {
      controls.object.position.set(targetX, targetY, W * 3.6);
      controls.target.set(targetX, targetY, targetZ);
    } else if (cameraPreset === 'back') {
      controls.object.position.set(L + 4.5, targetY, targetZ);
      controls.target.set(targetX, targetY, targetZ);
    }
    controls.update();
  }, [cameraPreset, L, W, H, targetX, targetY, targetZ]);

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

  const handleZoom = (delta: number) => {
    if (!controlsRef.current) return;
    const camera = controlsRef.current.object;
    camera.zoom = Math.max(0.5, Math.min(2.5, camera.zoom + delta));
    camera.updateProjectionMatrix();
  };

  const handleResetCamera = () => {
    if (!controlsRef.current) return;
    controlsRef.current.object.position.set(targetX - 1.5, targetY + H * 0.45, W * 3.6);
    controlsRef.current.target.set(targetX, targetY, targetZ);
    controlsRef.current.object.zoom = 1;
    controlsRef.current.object.updateProjectionMatrix();
    controlsRef.current.update();
  };

  return (
    <div
      className="relative h-full w-full bg-[#f8fafc]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedLoadPackageId(null);
        }
      }}
    >
      <Canvas shadows gl={{ antialias: true, alpha: true }}>
        {/* Cinematic Side 3/4 Camera matching the reference screenshot */}
        <PerspectiveCamera
          makeDefault
          position={[targetX - 1.5, targetY + H * 0.45, W * 3.6]}
          fov={38}
        />
        <OrbitControls
          ref={controlsRef}
          target={[targetX, targetY, targetZ]}
          maxPolarAngle={Math.PI / 2 - 0.02} // Ground clamp
          minDistance={3}
          maxDistance={40}
          enableDamping
          dampingFactor={0.08}
        />

        {/* Studio Lighting matching clean minimalist aesthetic */}
        <ambientLight intensity={1.1} />
        <directionalLight
          position={[-6, 16, 12]}
          intensity={1.3}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={40}
          shadow-camera-left={-15}
          shadow-camera-right={20}
          shadow-camera-top={15}
          shadow-camera-bottom={-5}
        />
        <directionalLight position={[12, 10, 8]} intensity={0.6} />
        <directionalLight position={[targetX, -5, -10]} intensity={0.2} />

        {/* ── 1. REALISTIC 3D CABIN (Tractor cab attached at X <= 0) ── */}
        <TruckCabin3D trailerWidth={W} />

        {/* ── 2. REALISTIC 3D TRAILER & CHASSIS (Cutaway Showcase) ── */}
        <TrailerChassis3D vehicle={vehicle} floorY={TRAILER_FLOOR_Y} />

        {/* ── 3. CARGO PACKAGES (Offset by floor elevation) ── */}
        <group position={[0, TRAILER_FLOOR_Y, 0]}>
          {placedItems.map(({ pkg, placement }) => (
            <Package3D
              key={pkg.id}
              id={pkg.id}
              name={pkg.packageDefinition?.name || 'Pallet'}
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
              routingTag={pkg.packageDefinition?.sku || 'B2R'}
            />
          ))}
        </group>

        {/* Center of Gravity Marker */}
        <CenterOfGravityMarker floorY={TRAILER_FLOOR_Y} trailerHeight={H} />

        {/* Studio Contact Shadows under the whole vehicle */}
        <ContactShadows
          position={[targetX, 0.01, targetZ]}
          opacity={0.6}
          scale={L + 12}
          blur={1.8}
          far={3}
          resolution={1024}
          color="#0f172a"
        />
      </Canvas>

      {/* Floating 3D Navigation Controls on the Left (Matching Reference Image) */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 select-none pointer-events-auto z-10">
        {/* Zoom slider pill */}
        <div className="flex flex-col items-center justify-between w-8 h-28 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-slate-200/80 p-2">
          <button
            onClick={() => handleZoom(0.15)}
            className="w-5 h-5 flex items-center justify-center text-slate-700 hover:text-purple-600 font-semibold text-sm transition-colors"
            title="Zoom In"
          >
            +
          </button>
          <div className="w-1.5 h-12 bg-slate-200 rounded-full relative flex items-center justify-center">
            <div className="w-3.5 h-3.5 bg-slate-800 rounded-full shadow-sm hover:scale-110 transition-transform cursor-pointer" />
          </div>
          <button
            onClick={() => handleZoom(-0.15)}
            className="w-5 h-5 flex items-center justify-center text-slate-700 hover:text-purple-600 font-semibold text-sm transition-colors"
            title="Zoom Out"
          >
            -
          </button>
        </div>

        {/* Reset Camera Pill */}
        <button
          onClick={handleResetCamera}
          className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-purple-600 hover:border-purple-300 transition-all text-xs font-bold"
          title="Reset to Reference View"
        >
          ✢
        </button>
      </div>
    </div>
  );
}

'use client';

import { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Package3D } from './Package3D';
import { usePlannerStore } from '@/store/plannerStore';
import type { VehicleDto, LoadPackageDto } from '@cargoflow/shared-types';

interface TrailerSceneProps {
  vehicle: VehicleDto;
  loadPackages: LoadPackageDto[];
}

function TrailerBounds({ vehicle }: { vehicle: VehicleDto }) {
  const L = vehicle.interiorLength / 1000;
  const W = vehicle.interiorWidth / 1000;
  const H = vehicle.interiorHeight / 1000;

  return (
    <group>
      {/* Trailer Floor with Grid */}
      <mesh position={[L / 2, 0, W / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[L, W]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.8} />
      </mesh>

      {/* Grid on Floor */}
      <gridHelper
        args={[Math.max(L, W), Math.round(Math.max(L, W) * 2), '#94a3b8', '#e2e8f0']}
        position={[L / 2, 0.001, W / 2]}
      />

      {/* Outer Wireframe Boundaries */}
      <lineSegments position={[L / 2, H / 2, W / 2]}>
        <edgesGeometry args={[new THREE.BoxGeometry(L, H, W)]} />
        <lineBasicMaterial color="#3b82f6" linewidth={1.5} opacity={0.6} transparent />
      </lineSegments>

      {/* Front Wall (solid subtle translucent) */}
      <mesh position={[0, H / 2, W / 2]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* Rear Door Opening Indicator */}
      <mesh position={[L, 0.05, W / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.2, vehicle.doorWidth / 1000]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
    </group>
  );
}

function CenterOfGravityMarker() {
  const { validationResult } = usePlannerStore();
  const cog = validationResult?.weightDistribution?.centerOfGravity;
  if (!cog || cog.x === 0 && cog.y === 0) return null;

  // Scale to scene
  const x = cog.x / 1000;
  const y = (cog.z || 100) / 1000;
  const z = cog.y / 1000;

  return (
    <group position={[x, y, z]}>
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#ef4444" roughness={0.2} emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      {/* Downward target line to floor */}
      <lineSegments>
        <bufferGeometry attach="geometry" {...new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, -y, 0),
        ])} />
        <lineDashedMaterial color="#ef4444" dashSize={0.1} gapSize={0.05} />
      </lineSegments>
    </group>
  );
}

export function TrailerScene({ vehicle, loadPackages }: TrailerSceneProps) {
  const { cameraPreset, placements, setSelectedLoadPackageId } = usePlannerStore();
  const controlsRef = useRef<any>(null);

  const L = vehicle.interiorLength / 1000;
  const W = vehicle.interiorWidth / 1000;
  const H = vehicle.interiorHeight / 1000;

  // Camera presets
  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    if (cameraPreset === 'isometric') {
      controls.object.position.set(-L * 0.8, H * 2.2, W * 2.4);
      controls.target.set(L / 2, H / 3, W / 2);
    } else if (cameraPreset === 'top') {
      controls.object.position.set(L / 2, H * 3.5, W / 2);
      controls.target.set(L / 2, 0, W / 2);
    } else if (cameraPreset === 'side') {
      controls.object.position.set(L / 2, H / 2, W * 3);
      controls.target.set(L / 2, H / 2, W / 2);
    } else if (cameraPreset === 'back') {
      controls.object.position.set(L * 2.2, H / 2, W / 2);
      controls.target.set(L / 2, H / 2, W / 2);
    }
    controls.update();
  }, [cameraPreset, L, W, H]);

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

    return list;
  }, [loadPackages, placements]);

  return (
    <div
      className="relative h-full w-full bg-gradient-to-b from-slate-100 to-slate-200"
      onPointerDown={(e) => {
        // Deselect if clicking on empty space
        if (e.target === e.currentTarget) {
          setSelectedLoadPackageId(null);
        }
      }}
    >
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[-L * 0.8, H * 2.2, W * 2.4]} fov={45} />
        <OrbitControls
          ref={controlsRef}
          target={[L / 2, H / 3, W / 2]}
          maxPolarAngle={Math.PI / 2 - 0.05} // Don't orbit below ground
          minDistance={1}
          maxDistance={35}
        />

        {/* Studio Lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[-10, 20, 15]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[10, 10, -10]} intensity={0.4} />

        {/* 3D Trailer Structure */}
        <TrailerBounds vehicle={vehicle} />

        {/* Placed Packages */}
        {placedItems.map(({ pkg, placement }) => (
          <Package3D
            key={pkg.id}
            id={pkg.id}
            name={pkg.packageDefinition?.name || 'Cargo Box'}
            dims={{
              length: pkg.packageDefinition?.length || 1000,
              width: pkg.packageDefinition?.width || 1000,
              height: pkg.packageDefinition?.height || 1000,
            }}
            position={{ x: placement.x, y: placement.y, z: placement.z }}
            rotationIndex={placement.rotationIndex}
            isFragile={pkg.packageDefinition?.isFragile}
            isHazardous={pkg.packageDefinition?.isHazardous}
            weightKg={pkg.packageDefinition?.weightKg || 0}
          />
        ))}

        {/* Center of Gravity indicator */}
        <CenterOfGravityMarker />
      </Canvas>
    </div>
  );
}


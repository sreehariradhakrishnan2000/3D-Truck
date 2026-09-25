'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { usePlannerStore } from '@/store/plannerStore';
import { applyRotation } from '@cargoflow/geometry';
import type { Dimensions3D, RotationIndex } from '@cargoflow/shared-types';

interface Package3DProps {
  id: string; // loadPackageId
  name: string;
  dims: Dimensions3D;
  position: { x: number; y: number; z: number };
  rotationIndex: RotationIndex;
  isFragile?: boolean;
  isHazardous?: boolean;
  weightKg: number;
}

export function Package3D({
  id,
  name,
  dims,
  position,
  rotationIndex,
  isFragile,
  isHazardous,
  weightKg,
}: Package3DProps) {
  const {
    selectedLoadPackageId,
    setSelectedLoadPackageId,
    hoveredPackageId,
    setHoveredPackageId,
    collidingPackageIds,
  } = usePlannerStore();

  const isSelected = selectedLoadPackageId === id;
  const isHovered = hoveredPackageId === id;
  const isColliding = collidingPackageIds.has(id);

  // Compute effective dimensions based on rotation
  const effective = useMemo(() => applyRotation(dims, rotationIndex), [dims, rotationIndex]);

  // Scale mm to meters for Three.js scene
  const w = effective.length / 1000;
  const h = effective.height / 1000; // Three.js Y is Up
  const d = effective.width / 1000;  // Three.js Z is Width

  // Position center of box in Three.js (CargoFlow X->Three X, Z->Three Y, Y->Three Z)
  const posX = (position.x + effective.length / 2) / 1000;
  const posY = (position.z + effective.height / 2) / 1000;
  const posZ = (position.y + effective.width / 2) / 1000;

  // Modern Apple-inspired pallet and box materials
  const boxColor = useMemo(() => {
    if (isColliding) return '#ef4444'; // Red collision
    if (isSelected) return '#3b82f6'; // Active Blue
    if (isFragile) return '#f59e0b'; // Amber warning
    if (isHazardous) return '#dc2626'; // Red hazardous
    return '#cbd5e1'; // Clean slate gray
  }, [isColliding, isSelected, isFragile, isHazardous]);

  return (
    <group position={[posX, posY, posZ]}>
      {/* Main Solid Box */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          setSelectedLoadPackageId(isSelected ? null : id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredPackageId(id);
        }}
        onPointerOut={() => setHoveredPackageId(null)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={boxColor}
          roughness={0.4}
          metalness={0.1}
          opacity={isSelected ? 0.95 : 0.9}
          transparent
        />
      </mesh>

      {/* Clean Edge Wireframe for Crisp Definition */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial
          color={isSelected ? '#1d4ed8' : isColliding ? '#b91c1c' : '#64748b'}
          linewidth={isSelected ? 2 : 1}
        />
      </lineSegments>
    </group>
  );
}


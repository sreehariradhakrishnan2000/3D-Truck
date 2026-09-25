'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
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
  routingTag?: string;
  showLabels?: boolean;
}

/**
 * 3D Transform Axis Gizmo rendered directly on the selected package matching the reference design:
 * - Red Arrow pointing along +X (Trailer length)
 * - Green Arrow pointing along +Y (Elevation / Up)
 * - Blue Arrow pointing along +Z (Trailer width / Side)
 * - Center origin sphere with axis handles
 */
function TransformAxisGizmo({ size = 0.5 }: { size?: number }) {
  const arrowLength = Math.max(0.35, size);
  const headLength = arrowLength * 0.28;
  const headWidth = arrowLength * 0.16;

  return (
    <group position={[0, 0, 0]}>
      {/* Central Origin Sphere */}
      <mesh>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Red X Axis (Forward/Length) */}
      <group>
        <mesh position={[arrowLength / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, arrowLength, 12]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh position={[arrowLength + headLength / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[headWidth, headLength, 16]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* Green Y Axis (Upward/Elevation) */}
      <group>
        <mesh position={[0, arrowLength / 2, 0]}>
          <cylinderGeometry args={[0.015, 0.015, arrowLength, 12]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
        <mesh position={[0, arrowLength + headLength / 2, 0]}>
          <coneGeometry args={[headWidth, headLength, 16]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      </group>

      {/* Blue Z Axis (Sideways/Width) */}
      <group>
        <mesh position={[0, 0, arrowLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, arrowLength, 12]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <mesh position={[0, 0, arrowLength + headLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[headWidth, headLength, 16]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Photorealistic Cargo Packages matching the reference design:
 * - Varied package materials: Kraft cardboard brown, industrial blue wrapped, clean white corrugated
 * - Wooden pallet base for floor-level cargo
 * - Packaging tape and shipping labels
 * - Selected state: semi-transparent glowing blue mesh with crisp white/cyan wireframe
 *   and interactive 3D RGB Transform Axis Gizmo (Red X, Green Y, Blue Z)
 */
export function Package3D({
  id,
  name,
  dims,
  position,
  rotationIndex,
  isFragile,
  isHazardous,
  weightKg,
  routingTag,
  showLabels = true,
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

  // Has wooden pallet underneath if on floor (Z ≈ 0)
  const isOnFloor = position.z <= 10;

  // Determine realistic material appearance based on package name / ID
  const packageStyle = useMemo(() => {
    // Generate deterministic hash from id
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
    const variant = Math.abs(hash) % 3;

    if (variant === 0) {
      // Warm Kraft Cardboard
      return {
        type: 'cardboard',
        color: '#ca8a04',
        roughness: 0.85,
        metalness: 0.05,
        tapeColor: '#a16207',
      };
    } else if (variant === 1) {
      // Industrial Blue Shrink-Wrap
      return {
        type: 'blue-wrapped',
        color: '#2563eb',
        roughness: 0.35,
        metalness: 0.25,
        tapeColor: '#1d4ed8',
      };
    } else {
      // Clean White / Light-Grey Carton
      return {
        type: 'white-carton',
        color: '#f1f5f9',
        roughness: 0.7,
        metalness: 0.05,
        tapeColor: '#cbd5e1',
      };
    }
  }, [id]);

  const boxColor = useMemo(() => {
    if (isColliding) return '#ef4444';
    if (isSelected) return '#3b82f6'; // Semi-transparent blue highlight
    if (isHovered) return '#60a5fa';
    return packageStyle.color;
  }, [isColliding, isSelected, isHovered, packageStyle.color]);

  const borderColor = useMemo(() => {
    if (isColliding) return '#dc2626';
    if (isSelected) return '#ffffff'; // Crisp white wireframe
    if (isHovered) return '#93c5fd';
    return '#475569';
  }, [isColliding, isSelected, isHovered]);

  return (
    <group position={[posX, posY, posZ]}>
      {/* ── WOODEN PALLET BASE (Underneath cargo resting on floor) ── */}
      {isOnFloor && (
        <group position={[0, -h / 2 + 0.06, 0]}>
          {/* Main Pallet Block Base */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[w * 0.96, 0.12, d * 0.96]} />
            <meshStandardMaterial color="#d97706" roughness={0.9} />
          </mesh>
          {/* Slat Lines */}
          <mesh position={[0, 0.061, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w * 0.94, d * 0.94]} />
            <meshStandardMaterial color="#b45309" roughness={0.8} />
          </mesh>
        </group>
      )}

      {/* ── MAIN SOLID / TRANSLUCENT CARGO BOX ── */}
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
          roughness={packageStyle.roughness}
          metalness={packageStyle.metalness}
          transparent={isSelected}
          opacity={isSelected ? 0.65 : 1.0}
        />
      </mesh>

      {/* ── CRISP WIREFRAME EDGES ── */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial
          color={borderColor}
          linewidth={isSelected ? 2.5 : 1}
        />
      </lineSegments>

      {/* ── PACKAGING TAPE SEAMS (On Cardboard & White Cartons) ── */}
      {!isSelected && packageStyle.type !== 'blue-wrapped' && (
        <mesh position={[0, h / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w * 0.98, d * 0.12]} />
          <meshStandardMaterial color={packageStyle.tapeColor} roughness={0.6} />
        </mesh>
      )}

      {/* ── PRINTED LABELS & SHIPPING BARCODES ── */}
      {showLabels && !isSelected && w > 0.4 && h > 0.3 && (
        <group position={[0, 0, d / 2 + 0.002]}>
          {/* White Shipping Label Plate */}
          <mesh position={[-w * 0.22, h * 0.15, 0]}>
            <planeGeometry args={[Math.min(0.28, w * 0.4), Math.min(0.2, h * 0.35)]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>

          {/* Barcode Lines */}
          <mesh position={[-w * 0.22, h * 0.12, 0.001]}>
            <planeGeometry args={[Math.min(0.22, w * 0.32), 0.05]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>

          {/* Text Code */}
          <Text
            position={[-w * 0.22, h * 0.22, 0.002]}
            fontSize={0.06}
            color="#0f172a"
            anchorX="center"
            anchorY="middle"
          >
            {routingTag || 'PKG-1004'}
          </Text>

          {/* Weight Stamp */}
          <Text
            position={[w * 0.22, -h * 0.2, 0.001]}
            fontSize={0.08}
            color={packageStyle.type === 'cardboard' ? '#78350f' : '#334155'}
            fontWeight="bold"
            anchorX="center"
            anchorY="middle"
          >
            {`${Math.round(weightKg)} kg`}
          </Text>
        </group>
      )}

      {/* ── 3D TRANSFORM AXIS GIZMO (Rendered on Selected Package) ── */}
      {isSelected && (
        <group position={[0, 0, 0]}>
          <TransformAxisGizmo size={Math.min(w, Math.min(h, d)) * 0.65} />
        </group>
      )}

      {/* Fragile Warning Tape */}
      {isFragile && (
        <mesh position={[0, h / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w * 0.8, d * 0.15]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      )}

      {/* Hazardous Material Warning Tape */}
      {isHazardous && (
        <mesh position={[0, h / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w * 0.8, d * 0.15]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}
    </group>
  );
}

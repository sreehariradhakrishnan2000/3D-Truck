'use client';

import { useMemo } from 'react';
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
}

/**
 * Photorealistic 3D Cargo Carton matching the reference design:
 * - Off-white clean cardboard finish with subtle bevel edge
 * - Printed weight (e.g. "500 kg") and routing tag (e.g. "B2R", "2-NYK LDN")
 * - When selected: Vivid purple border (#7c3aed) + central glowing purple badge/dot with white core
 * - When colliding: Red warning state
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

  // Clean carton styling matching reference image
  const boxColor = useMemo(() => {
    if (isColliding) return '#fee2e2'; // Soft red
    if (isSelected) return '#f5f3ff'; // Subtle purple tint
    if (isHovered) return '#f8fafc';
    return '#f1f5f9'; // Clean off-white cardboard
  }, [isColliding, isSelected, isHovered]);

  const borderColor = useMemo(() => {
    if (isColliding) return '#dc2626';
    if (isSelected) return '#7c3aed'; // Vivid Purple matching reference
    if (isHovered) return '#6366f1';
    return '#cbd5e1'; // Subtle slate border
  }, [isColliding, isSelected, isHovered]);

  // Format weight and routing text
  const weightText = `${Math.round(weightKg || 500)} kg`;
  const tagText = routingTag || (name.length > 9 ? name.slice(0, 9) : name || 'B2R');

  // Text font size scaled by box dimensions
  const fontSize = Math.min(0.14, Math.min(w, h) * 0.16);

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
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* Crisp Perimeter Border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial
          color={borderColor}
          linewidth={isSelected ? 3 : 1}
        />
      </lineSegments>

      {/* ── FRONT FACE LABELS (Facing +Z towards open trailer cutaway) ── */}
      {w > 0.4 && h > 0.3 && (
        <group position={[0, 0, d / 2 + 0.002]}>
          {/* Top Line: Routing Tag & Weight */}
          <Text
            position={[-w * 0.28, h * 0.28, 0]}
            fontSize={fontSize * 0.9}
            color="#64748b"
            anchorX="center"
            anchorY="middle"
            maxWidth={w * 0.45}
          >
            {tagText}
          </Text>

          <Text
            position={[w * 0.25, h * 0.28, 0]}
            fontSize={fontSize}
            color="#1e293b"
            anchorX="center"
            anchorY="middle"
            maxWidth={w * 0.45}
            fontWeight="bold"
          >
            {weightText}
          </Text>

          {/* Subtitle / Location Code */}
          <Text
            position={[-w * 0.25, -h * 0.26, 0]}
            fontSize={fontSize * 0.75}
            color="#94a3b8"
            anchorX="center"
            anchorY="middle"
            maxWidth={w * 0.45}
          >
            2-NYK LDN
          </Text>

          {/* Center Subtle Cross / Icon for unselected items */}
          {!isSelected && (
            <Text
              position={[0, 0, 0]}
              fontSize={fontSize * 0.7}
              color="#cbd5e1"
              anchorX="center"
              anchorY="middle"
            >
              +
            </Text>
          )}

          {/* ── SELECTED CENTRAL PURPLE DOT MARKER (1:1 with reference image) ── */}
          {isSelected && (
            <group position={[0, 0, 0.003]}>
              {/* Outer Glowing Purple Circle */}
              <mesh>
                <circleGeometry args={[Math.min(0.09, Math.min(w, h) * 0.14), 32]} />
                <meshBasicMaterial color="#7c3aed" />
              </mesh>
              {/* Inner Crisp White Core Dot */}
              <mesh position={[0, 0, 0.001]}>
                <circleGeometry args={[Math.min(0.035, Math.min(w, h) * 0.055), 24]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          )}
        </group>
      )}

      {/* Fragile / Hazardous Indicator Ribbons */}
      {isFragile && (
        <mesh position={[0, h / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w * 0.8, d * 0.2]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      )}
      {isHazardous && (
        <mesh position={[0, h / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w * 0.8, d * 0.2]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}
    </group>
  );
}

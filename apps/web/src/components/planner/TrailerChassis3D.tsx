'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { VehicleDto } from '@cargoflow/shared-types';

interface WheelProps {
  position: [number, number, number];
  isDual?: boolean;
}

function TrailerWheel({ position, isDual = true }: WheelProps) {
  return (
    <group position={position}>
      {/* Outer Rubber Tire */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.52, isDual ? 0.48 : 0.28, 32]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Chrome / Silver Rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.34, isDual ? 0.49 : 0.29, 24]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Hub Cap */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, isDual ? 0.52 : 0.31, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.5} />
      </mesh>
    </group>
  );
}

interface TrailerChassis3DProps {
  vehicle: VehicleDto;
  floorY?: number;
}

/**
 * High-fidelity 3D Semi-Trailer Chassis & Structure matching the user's reference image:
 * - Sleek modern white front bulkhead, aerodynamic roof panel, rear pillar frame
 * - Realistic interior: off-white back wall with horizontal e-track cargo tie-down rails and floor guides
 * - Open cutaway showcase side for crisp cargo visibility
 * - Under-trailer dark chassis I-beams, landing gear legs, aerodynamic side skirts
 * - Rear tandem dual-wheel axles with mudguards and rear underrun safety bumper
 */
export function TrailerChassis3D({ vehicle, floorY = 1.02 }: TrailerChassis3DProps) {
  const L = vehicle.interiorLength / 1000;
  const W = vehicle.interiorWidth / 1000;
  const H = vehicle.interiorHeight / 1000;
  const Z_center = W / 2;

  // Glossy clean white paint for trailer exterior panels
  const exteriorWhite = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.25,
        metalness: 0.1,
      }),
    []
  );

  // Dark matte steel / chassis slate
  const chassisMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.8,
        metalness: 0.3,
      }),
    []
  );

  // Aerodynamic dark side skirt material
  const skirtMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.6,
        metalness: 0.2,
      }),
    []
  );

  // Interior light gray wall material
  const interiorWallMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.85,
        metalness: 0.05,
      }),
    []
  );

  // Aluminum e-track rail material
  const aluminumRailMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.3,
        metalness: 0.8,
      }),
    []
  );

  // Rear axle positions calculated from length
  const axle1_X = Math.max(2.5, L - 2.8);
  const axle2_X = Math.max(3.8, L - 1.5);

  return (
    <group position={[0, 0, 0]}>
      {/* ══════════════════════════════════════════════════════════
          1. UNDER-TRAILER CHASSIS & RUNNING GEAR (World space)
          ══════════════════════════════════════════════════════════ */}

      {/* Main Steel I-Beam Chassis Rails (Run from X = 0.2m to X = L - 0.2m) */}
      <mesh position={[L / 2, floorY - 0.12, Z_center - 0.55]} material={chassisMaterial} castShadow>
        <boxGeometry args={[L - 0.4, 0.2, 0.12]} />
      </mesh>
      <mesh position={[L / 2, floorY - 0.12, Z_center + 0.55]} material={chassisMaterial} castShadow>
        <boxGeometry args={[L - 0.4, 0.2, 0.12]} />
      </mesh>

      {/* Crossmembers underneath floor */}
      {Array.from({ length: Math.floor(L / 1.5) }).map((_, i) => (
        <mesh
          key={i}
          position={[0.8 + i * 1.5, floorY - 0.08, Z_center]}
          material={chassisMaterial}
        >
          <boxGeometry args={[0.08, 0.12, W - 0.2]} />
        </mesh>
      ))}

      {/* Landing Gear Support Legs (X ≈ 2.4m) */}
      <group position={[2.4, 0, 0]}>
        {/* Left Leg */}
        <mesh position={[0, (floorY - 0.1) / 2, Z_center - 0.85]} material={chassisMaterial} castShadow>
          <boxGeometry args={[0.14, floorY - 0.1, 0.14]} />
        </mesh>
        {/* Left Foot Pad */}
        <mesh position={[0, 0.04, Z_center - 0.85]} material={chassisMaterial}>
          <boxGeometry args={[0.26, 0.06, 0.26]} />
        </mesh>

        {/* Right Leg */}
        <mesh position={[0, (floorY - 0.1) / 2, Z_center + 0.85]} material={chassisMaterial} castShadow>
          <boxGeometry args={[0.14, floorY - 0.1, 0.14]} />
        </mesh>
        {/* Right Foot Pad */}
        <mesh position={[0, 0.04, Z_center + 0.85]} material={chassisMaterial}>
          <boxGeometry args={[0.26, 0.06, 0.26]} />
        </mesh>

        {/* Crossbar between legs */}
        <mesh position={[0, floorY * 0.45, Z_center]} material={chassisMaterial}>
          <boxGeometry args={[0.08, 0.08, 1.7]} />
        </mesh>
      </group>

      {/* Aerodynamic Lower Side Skirts (Matching reference image dark under-panel) */}
      {L > 6 && (
        <group>
          {/* Near Side Skirt (Facing camera at Z_center + W/2 - 0.05) */}
          <mesh
            position={[(2.8 + axle1_X - 0.4) / 2, 0.52, Z_center + W / 2 - 0.06]}
            material={skirtMaterial}
          >
            <boxGeometry args={[axle1_X - 0.4 - 2.8, 0.5, 0.04]} />
          </mesh>
          {/* Far Side Skirt */}
          <mesh
            position={[(2.8 + axle1_X - 0.4) / 2, 0.52, Z_center - W / 2 + 0.06]}
            material={skirtMaterial}
          >
            <boxGeometry args={[axle1_X - 0.4 - 2.8, 0.5, 0.04]} />
          </mesh>
        </group>
      )}

      {/* Rear Tandem Wheels (Left & Right dual wheels) */}
      <TrailerWheel position={[axle1_X, 0.52, Z_center - W / 2 + 0.32]} isDual />
      <TrailerWheel position={[axle1_X, 0.52, Z_center + W / 2 - 0.32]} isDual />

      <TrailerWheel position={[axle2_X, 0.52, Z_center - W / 2 + 0.32]} isDual />
      <TrailerWheel position={[axle2_X, 0.52, Z_center + W / 2 - 0.32]} isDual />

      {/* Tandem Axle Rods */}
      <mesh position={[axle1_X, 0.52, Z_center]} rotation={[Math.PI / 2, 0, 0]} material={chassisMaterial}>
        <cylinderGeometry args={[0.07, 0.07, W - 0.4, 16]} />
      </mesh>
      <mesh position={[axle2_X, 0.52, Z_center]} rotation={[Math.PI / 2, 0, 0]} material={chassisMaterial}>
        <cylinderGeometry args={[0.07, 0.07, W - 0.4, 16]} />
      </mesh>

      {/* Rear Wheel Mudguards / Fenders */}
      <mesh position={[(axle1_X + axle2_X) / 2, 1.0, Z_center + W / 2 - 0.3]} material={chassisMaterial}>
        <boxGeometry args={[axle2_X - axle1_X + 1.25, 0.04, 0.55]} />
      </mesh>
      <mesh position={[(axle1_X + axle2_X) / 2, 1.0, Z_center - W / 2 + 0.3]} material={chassisMaterial}>
        <boxGeometry args={[axle2_X - axle1_X + 1.25, 0.04, 0.55]} />
      </mesh>

      {/* Rear Rubber Mudflaps */}
      <mesh position={[axle2_X + 0.72, 0.48, Z_center + W / 2 - 0.32]} material={skirtMaterial}>
        <boxGeometry args={[0.02, 0.55, 0.5]} />
      </mesh>
      <mesh position={[axle2_X + 0.72, 0.48, Z_center - W / 2 + 0.32]} material={skirtMaterial}>
        <boxGeometry args={[0.02, 0.55, 0.5]} />
      </mesh>

      {/* Rear Underrun Protection Bumper Bar with Tail Lights */}
      <group position={[L + 0.05, 0.48, Z_center]}>
        {/* Main Bumper Bar */}
        <mesh material={chassisMaterial} castShadow>
          <boxGeometry args={[0.1, 0.14, W + 0.05]} />
        </mesh>
        {/* Left Brake Lights */}
        <mesh position={[0.06, 0, -W / 2 + 0.25]}>
          <boxGeometry args={[0.02, 0.08, 0.3]} />
          <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={0.6} />
        </mesh>
        {/* Right Brake Lights */}
        <mesh position={[0.06, 0, W / 2 - 0.25]}>
          <boxGeometry args={[0.02, 0.08, 0.3]} />
          <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={0.6} />
        </mesh>
        {/* License Plate / Center Warning Strip */}
        <mesh position={[0.06, 0, 0]}>
          <boxGeometry args={[0.01, 0.07, 0.35]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} />
        </mesh>
      </group>

      {/* ══════════════════════════════════════════════════════════
          2. TRAILER BODY & ENCLOSURE (Offset by floorY)
          ══════════════════════════════════════════════════════════ */}
      <group position={[0, floorY, 0]}>
        {/* Heavy-Duty Floor Deck */}
        <mesh position={[L / 2, -0.02, Z_center]} receiveShadow>
          <boxGeometry args={[L, 0.04, W]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.8} metalness={0.1} />
        </mesh>

        {/* Floor Surface Anti-slip Stripes */}
        <mesh position={[L / 2, 0.002, Z_center]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[L - 0.1, W - 0.1]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
        </mesh>

        {/* Front Bulkhead Wall (Solid White, facing cab) */}
        <mesh position={[0.04, H / 2, Z_center]} material={exteriorWhite} castShadow>
          <boxGeometry args={[0.08, H, W]} />
        </mesh>
        {/* Front Bulkhead Aerodynamic Top Radius */}
        <mesh position={[0.1, H - 0.05, Z_center]} material={exteriorWhite}>
          <boxGeometry args={[0.2, 0.1, W]} />
        </mesh>

        {/* Roof Panel (Solid White Insulated Composite) */}
        <mesh position={[L / 2, H + 0.03, Z_center]} material={exteriorWhite} castShadow>
          <boxGeometry args={[L + 0.08, 0.06, W + 0.06]} />
        </mesh>

        {/* Interior Back Wall (Z = 0, Behind Cargo) */}
        <mesh position={[L / 2, H / 2, 0.02]} material={interiorWallMaterial}>
          <boxGeometry args={[L, H, 0.04]} />
        </mesh>

        {/* E-Track Horizontal Tie-Down Aluminum Rails on Back Wall */}
        <mesh position={[L / 2, H * 0.3, 0.045]} material={aluminumRailMaterial}>
          <boxGeometry args={[L - 0.2, 0.08, 0.015]} />
        </mesh>
        <mesh position={[L / 2, H * 0.6, 0.045]} material={aluminumRailMaterial}>
          <boxGeometry args={[L - 0.2, 0.08, 0.015]} />
        </mesh>

        {/* Rear Door Frame Vertical Pillars */}
        <mesh position={[L - 0.04, H / 2, 0.05]} material={exteriorWhite}>
          <boxGeometry args={[0.08, H, 0.1]} />
        </mesh>
        <mesh position={[L - 0.04, H / 2, W - 0.05]} material={exteriorWhite}>
          <boxGeometry args={[0.08, H, 0.1]} />
        </mesh>
        {/* Rear Door Top Lintel */}
        <mesh position={[L - 0.04, H - 0.05, Z_center]} material={exteriorWhite}>
          <boxGeometry args={[0.08, 0.1, W]} />
        </mesh>

        {/* Showcase Cutaway Side Border Rails (Clean Architectural Framing) */}
        {/* Bottom Rail along Cutaway Edge */}
        <mesh position={[L / 2, 0.03, W - 0.02]} material={exteriorWhite}>
          <boxGeometry args={[L, 0.06, 0.04]} />
        </mesh>
        {/* Top Rail along Cutaway Edge */}
        <mesh position={[L / 2, H - 0.02, W - 0.02]} material={exteriorWhite}>
          <boxGeometry args={[L, 0.04, 0.04]} />
        </mesh>
      </group>
    </group>
  );
}

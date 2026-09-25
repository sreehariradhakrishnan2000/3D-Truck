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
      {/* Silver Outer Rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.34, isDual ? 0.49 : 0.29, 24]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Lug Nut Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, isDual ? 0.5 : 0.3, 16]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Hub Cap */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.14, isDual ? 0.52 : 0.32, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.5} />
      </mesh>
    </group>
  );
}

interface TrailerChassis3DProps {
  vehicle: VehicleDto;
  floorY?: number;
  transparentWalls?: boolean;
}

/**
 * High-fidelity 3D Semi-Trailer Chassis & Structure matching the reference design:
 * - See-through cutaway structure: roof and near side are open, far wall is transparent/cutaway
 *   enabling clear visibility into the cargo area from ALL angles around the truck (front, back, left, right, top)
 * - White structural corner posts, top perimeter roof rails, and floor decking
 * - Under-trailer steel I-beams, landing gear, side protection ladder rails
 * - Rear tandem dual-wheel axles with mudguards and rear underrun safety bumper
 * - Rear door frame with open rear doors
 */
export function TrailerChassis3D({
  vehicle,
  floorY = 1.02,
  transparentWalls = true,
}: TrailerChassis3DProps) {
  const L = vehicle.interiorLength / 1000;
  const W = vehicle.interiorWidth / 1000;
  const H = vehicle.interiorHeight / 1000;
  const Z_center = W / 2;

  // Glossy clean white paint for trailer structural framing
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

  // Silver metal for underrun guard rails
  const silverGuardMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        roughness: 0.3,
        metalness: 0.7,
      }),
    []
  );

  // Far wall material: semi-transparent when transparentWalls is on
  const farWallMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.85,
        metalness: 0.05,
        transparent: transparentWalls,
        opacity: transparentWalls ? 0.35 : 0.95,
        side: THREE.DoubleSide,
      }),
    [transparentWalls]
  );

  // Aluminum e-track rail material
  const aluminumRailMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.3,
        metalness: 0.8,
        transparent: transparentWalls,
        opacity: transparentWalls ? 0.6 : 1.0,
      }),
    [transparentWalls]
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
        <mesh position={[0, 0.04, Z_center - 0.85]} material={chassisMaterial}>
          <boxGeometry args={[0.26, 0.06, 0.26]} />
        </mesh>

        {/* Right Leg */}
        <mesh position={[0, (floorY - 0.1) / 2, Z_center + 0.85]} material={chassisMaterial} castShadow>
          <boxGeometry args={[0.14, floorY - 0.1, 0.14]} />
        </mesh>
        <mesh position={[0, 0.04, Z_center + 0.85]} material={chassisMaterial}>
          <boxGeometry args={[0.26, 0.06, 0.26]} />
        </mesh>

        {/* Crossbar between legs */}
        <mesh position={[0, floorY * 0.45, Z_center]} material={chassisMaterial}>
          <boxGeometry args={[0.08, 0.08, 1.7]} />
        </mesh>
      </group>

      {/* Side Protection Underrun Ladder Guards (Matching reference image silver rails) */}
      {L > 6 && (
        <group>
          {/* Near Side Guard (Facing camera at Z_center + W/2 - 0.06) */}
          <group position={[(2.8 + axle1_X - 0.4) / 2, 0.52, Z_center + W / 2 - 0.06]}>
            {/* Top Bar */}
            <mesh position={[0, 0.16, 0]} material={silverGuardMaterial}>
              <boxGeometry args={[axle1_X - 0.4 - 2.8, 0.06, 0.04]} />
            </mesh>
            {/* Middle Bar */}
            <mesh position={[0, 0, 0]} material={silverGuardMaterial}>
              <boxGeometry args={[axle1_X - 0.4 - 2.8, 0.06, 0.04]} />
            </mesh>
            {/* Bottom Bar */}
            <mesh position={[0, -0.16, 0]} material={silverGuardMaterial}>
              <boxGeometry args={[axle1_X - 0.4 - 2.8, 0.06, 0.04]} />
            </mesh>
            {/* Vertical Supports */}
            <mesh position={[-(axle1_X - 0.4 - 2.8) * 0.35, 0, 0]} material={chassisMaterial}>
              <boxGeometry args={[0.06, 0.42, 0.03]} />
            </mesh>
            <mesh position={[(axle1_X - 0.4 - 2.8) * 0.35, 0, 0]} material={chassisMaterial}>
              <boxGeometry args={[0.06, 0.42, 0.03]} />
            </mesh>
          </group>

          {/* Far Side Guard */}
          <group position={[(2.8 + axle1_X - 0.4) / 2, 0.52, Z_center - W / 2 + 0.06]}>
            <mesh position={[0, 0.16, 0]} material={silverGuardMaterial}>
              <boxGeometry args={[axle1_X - 0.4 - 2.8, 0.06, 0.04]} />
            </mesh>
            <mesh position={[0, 0, 0]} material={silverGuardMaterial}>
              <boxGeometry args={[axle1_X - 0.4 - 2.8, 0.06, 0.04]} />
            </mesh>
            <mesh position={[0, -0.16, 0]} material={silverGuardMaterial}>
              <boxGeometry args={[axle1_X - 0.4 - 2.8, 0.06, 0.04]} />
            </mesh>
          </group>
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

      {/* Rear Wheel Mudguards / Curved Fenders */}
      <mesh position={[(axle1_X + axle2_X) / 2, 0.98, Z_center + W / 2 - 0.3]} material={chassisMaterial}>
        <boxGeometry args={[axle2_X - axle1_X + 1.25, 0.04, 0.55]} />
      </mesh>
      <mesh position={[(axle1_X + axle2_X) / 2, 0.98, Z_center - W / 2 + 0.3]} material={chassisMaterial}>
        <boxGeometry args={[axle2_X - axle1_X + 1.25, 0.04, 0.55]} />
      </mesh>

      {/* Rear Mudflaps with Logo Print */}
      <mesh position={[axle2_X + 0.72, 0.48, Z_center + W / 2 - 0.32]} material={chassisMaterial}>
        <boxGeometry args={[0.02, 0.55, 0.5]} />
      </mesh>
      <mesh position={[axle2_X + 0.72, 0.48, Z_center - W / 2 + 0.32]} material={chassisMaterial}>
        <boxGeometry args={[0.02, 0.55, 0.5]} />
      </mesh>

      {/* Rear Underrun Protection Bumper Bar with Tail Light Clusters */}
      <group position={[L + 0.05, 0.48, Z_center]}>
        <mesh material={chassisMaterial} castShadow>
          <boxGeometry args={[0.1, 0.14, W + 0.05]} />
        </mesh>
        {/* Left Brake / Tail Lights */}
        <mesh position={[0.06, 0, -W / 2 + 0.25]}>
          <boxGeometry args={[0.02, 0.08, 0.3]} />
          <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={0.8} />
        </mesh>
        {/* Right Brake / Tail Lights */}
        <mesh position={[0.06, 0, W / 2 - 0.25]}>
          <boxGeometry args={[0.02, 0.08, 0.3]} />
          <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={0.8} />
        </mesh>
        {/* Amber Indicators & Center Warning Plate */}
        <mesh position={[0.06, 0, 0]}>
          <boxGeometry args={[0.01, 0.07, 0.35]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} />
        </mesh>
      </group>

      {/* ══════════════════════════════════════════════════════════
          2. TRAILER BODY & CUTAWAY SHOWCASE ENCLOSURE
          (Offset by floorY — viewable through all places other than bottom)
          ══════════════════════════════════════════════════════════ */}
      <group position={[0, floorY, 0]}>
        {/* Solid Wooden / Aluminum Trailer Floor Deck */}
        <mesh position={[L / 2, -0.02, Z_center]} receiveShadow>
          <boxGeometry args={[L, 0.04, W]} />
          <meshStandardMaterial color="#334155" roughness={0.7} metalness={0.2} />
        </mesh>

        {/* Floor Surface Anti-slip Deck Planks */}
        <mesh position={[L / 2, 0.002, Z_center]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[L - 0.08, W - 0.08]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} metalness={0.1} />
        </mesh>

        {/* Front Bulkhead Wall (Solid White, facing cab) */}
        <mesh position={[0.04, H / 2, Z_center]} material={exteriorWhite} castShadow>
          <boxGeometry args={[0.08, H, W]} />
        </mesh>

        {/* Front Bulkhead Aerodynamic Nose Corner Posts */}
        <mesh position={[0.04, H / 2, 0.04]} material={exteriorWhite}>
          <boxGeometry args={[0.09, H, 0.09]} />
        </mesh>
        <mesh position={[0.04, H / 2, W - 0.04]} material={exteriorWhite}>
          <boxGeometry args={[0.09, H, 0.09]} />
        </mesh>

        {/* ── CUTAWAY / TRANSPARENT FAR WALL (Z = 0) ── */}
        <mesh position={[L / 2, H / 2, 0.02]} material={farWallMaterial}>
          <boxGeometry args={[L, H, 0.04]} />
        </mesh>

        {/* E-Track Horizontal Tie-Down Aluminum Rails on Far Wall */}
        <mesh position={[L / 2, H * 0.3, 0.045]} material={aluminumRailMaterial}>
          <boxGeometry args={[L - 0.2, 0.08, 0.015]} />
        </mesh>
        <mesh position={[L / 2, H * 0.65, 0.045]} material={aluminumRailMaterial}>
          <boxGeometry args={[L - 0.2, 0.08, 0.015]} />
        </mesh>

        {/* ── TOP PERIMETER ROOF RAILS (Framing the Open Roof) ── */}
        {/* Far Top Rail */}
        <mesh position={[L / 2, H - 0.02, 0.03]} material={exteriorWhite}>
          <boxGeometry args={[L, 0.06, 0.06]} />
        </mesh>
        {/* Near Top Rail */}
        <mesh position={[L / 2, H - 0.02, W - 0.03]} material={exteriorWhite}>
          <boxGeometry args={[L, 0.06, 0.06]} />
        </mesh>
        {/* Front Top Cross Rail */}
        <mesh position={[0.04, H - 0.02, Z_center]} material={exteriorWhite}>
          <boxGeometry args={[0.08, 0.06, W]} />
        </mesh>
        {/* Rear Top Door Lintel */}
        <mesh position={[L - 0.04, H - 0.02, Z_center]} material={exteriorWhite}>
          <boxGeometry args={[0.08, 0.08, W]} />
        </mesh>

        {/* ── NEAR SIDE CUTAWAY FRAMING (Facing Camera) ── */}
        {/* Bottom Sill Rail along Near Edge */}
        <mesh position={[L / 2, 0.03, W - 0.02]} material={exteriorWhite}>
          <boxGeometry args={[L, 0.06, 0.04]} />
        </mesh>

        {/* ── REAR DOOR FRAME & OPEN REAR DOORS ── */}
        {/* Left Rear Pillar */}
        <mesh position={[L - 0.04, H / 2, 0.05]} material={exteriorWhite}>
          <boxGeometry args={[0.08, H, 0.1]} />
        </mesh>
        {/* Right Rear Pillar */}
        <mesh position={[L - 0.04, H / 2, W - 0.05]} material={exteriorWhite}>
          <boxGeometry args={[0.08, H, 0.1]} />
        </mesh>

        {/* Open Right Rear Door (Swung open ~70 degrees outwards) */}
        <group position={[L - 0.02, H / 2, W - 0.05]} rotation={[0, -0.65, 0]}>
          <mesh position={[0.04, 0, (W / 2) * 0.45]} material={exteriorWhite}>
            <boxGeometry args={[0.05, H * 0.95, W * 0.48]} />
          </mesh>
          {/* Door Red Reflective Marker */}
          <mesh position={[0.07, -H * 0.35, (W / 2) * 0.45]}>
            <boxGeometry args={[0.01, 0.08, W * 0.42]} />
            <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

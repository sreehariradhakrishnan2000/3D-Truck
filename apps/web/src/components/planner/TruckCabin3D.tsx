'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface WheelProps {
  position: [number, number, number];
  isDual?: boolean;
}

function Wheel({ position, isDual = false }: WheelProps) {
  return (
    <group position={position}>
      {/* Outer Rubber Tire */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.52, isDual ? 0.5 : 0.28, 32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Silver Outer Rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.34, isDual ? 0.51 : 0.29, 24]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Rim Nut Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, isDual ? 0.52 : 0.3, 16]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Center Hub */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.14, isDual ? 0.54 : 0.32, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.5} />
      </mesh>
    </group>
  );
}

interface TruckCabin3DProps {
  trailerWidth: number; // meters
}

/**
 * Modern European-style aerodynamic white semi-truck tractor cabin matching the reference image:
 * - High-gloss white cab with curved roof spoiler & aerodynamic side deflectors
 * - Large tinted panoramic windshield & side door windows
 * - Black multi-slat front grille, LED headlights, aerodynamic bumper
 * - Front steering axle & dual tandem rear drive axles with chrome rims
 * - Side fuel tanks, chassis steps, and fifth-wheel hitch plate
 */
export function TruckCabin3D({ trailerWidth }: TruckCabin3DProps) {
  const Z_center = trailerWidth / 2;

  // Glossy white paint for truck body
  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.2,
        metalness: 0.15,
      }),
    []
  );

  // Tinted dark glass for windshield & windows
  const glassMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.05,
        metalness: 0.95,
        transparent: true,
        opacity: 0.85,
      }),
    []
  );

  // Dark matte steel for chassis & trim
  const darkTrimMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.7,
        metalness: 0.3,
      }),
    []
  );

  // Chrome / silver metal
  const chromeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        roughness: 0.2,
        metalness: 0.85,
      }),
    []
  );

  return (
    <group position={[0, 0, 0]}>
      {/* ── CHASSIS FRAME RAILS (X: -4.8m to 0m) ── */}
      <mesh position={[-2.4, 0.58, Z_center]} material={darkTrimMaterial} castShadow>
        <boxGeometry args={[4.8, 0.24, 0.95]} />
      </mesh>

      {/* ── FIFTH WHEEL COUPLING PLATE (Hitch for trailer nose) ── */}
      <group position={[-0.85, 0.76, Z_center]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.46, 0.46, 0.08, 24]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.6, 0.04, 0.5]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.8} />
        </mesh>
      </group>

      {/* ── CABIN WHEELS ── */}
      {/* Front Steering Axle (X: -4.3m) */}
      <Wheel position={[-4.3, 0.52, Z_center - 1.05]} />
      <Wheel position={[-4.3, 0.52, Z_center + 1.05]} />

      {/* Rear Tandem Axle 1 (X: -1.9m, Dual wheels) */}
      <Wheel position={[-1.9, 0.52, Z_center - 0.96]} isDual />
      <Wheel position={[-1.9, 0.52, Z_center + 0.96]} isDual />

      {/* Rear Tandem Axle 2 (X: -0.9m, Dual wheels) */}
      <Wheel position={[-0.9, 0.52, Z_center - 0.96]} isDual />
      <Wheel position={[-0.9, 0.52, Z_center + 0.96]} isDual />

      {/* Rear Cab Mudguards over Tandem Wheels */}
      <mesh position={[-1.4, 0.96, Z_center - 0.96]} material={darkTrimMaterial}>
        <boxGeometry args={[2.2, 0.06, 0.6]} />
      </mesh>
      <mesh position={[-1.4, 0.96, Z_center + 0.96]} material={darkTrimMaterial}>
        <boxGeometry args={[2.2, 0.06, 0.6]} />
      </mesh>

      {/* ── FUEL TANKS & CHASSIS STEPS (Between front & rear wheels) ── */}
      <mesh position={[-3.1, 0.54, Z_center - 0.95]} rotation={[0, 0, Math.PI / 2]} material={chromeMaterial} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 1.35, 20]} />
      </mesh>
      <mesh position={[-3.1, 0.54, Z_center + 0.95]} rotation={[0, 0, Math.PI / 2]} material={chromeMaterial} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 1.35, 20]} />
      </mesh>

      {/* ── MAIN CABIN BODY (Modern European COE Profile) ── */}
      {/* Main Cab Box */}
      <mesh position={[-3.4, 2.2, Z_center]} material={bodyMaterial} castShadow>
        <boxGeometry args={[2.5, 2.6, 2.4]} />
      </mesh>

      {/* Aerodynamic Roof Deflector & Spoiler Fairing */}
      <group position={[-3.3, 3.75, Z_center]}>
        <mesh material={bodyMaterial} castShadow>
          <boxGeometry args={[2.3, 0.6, 2.38]} />
        </mesh>
        {/* Sloped front air curve */}
        <mesh position={[-0.8, -0.08, 0]} rotation={[0, 0, -0.38]} material={bodyMaterial}>
          <boxGeometry args={[1.1, 0.45, 2.36]} />
        </mesh>
      </group>

      {/* Side Aerodynamic Air Deflectors (Vertical fins beside cab) */}
      <mesh position={[-2.15, 2.4, Z_center - 1.25]} material={bodyMaterial}>
        <boxGeometry args={[0.15, 2.5, 0.1]} />
      </mesh>
      <mesh position={[-2.15, 2.4, Z_center + 1.25]} material={bodyMaterial}>
        <boxGeometry args={[0.15, 2.5, 0.1]} />
      </mesh>

      {/* ── LARGE FRONT WINDSHIELD ── */}
      <mesh position={[-4.66, 2.55, Z_center]} rotation={[0, 0, -0.15]} material={glassMaterial}>
        <boxGeometry args={[0.06, 1.3, 2.15]} />
      </mesh>

      {/* Side Door Windows */}
      <mesh position={[-3.65, 2.5, Z_center - 1.21]} material={glassMaterial}>
        <boxGeometry args={[1.1, 0.85, 0.04]} />
      </mesh>
      <mesh position={[-3.65, 2.5, Z_center + 1.21]} material={glassMaterial}>
        <boxGeometry args={[1.1, 0.85, 0.04]} />
      </mesh>

      {/* Door Handles */}
      <mesh position={[-3.1, 2.05, Z_center - 1.22]} material={darkTrimMaterial}>
        <boxGeometry args={[0.18, 0.04, 0.04]} />
      </mesh>
      <mesh position={[-3.1, 2.05, Z_center + 1.22]} material={darkTrimMaterial}>
        <boxGeometry args={[0.18, 0.04, 0.04]} />
      </mesh>

      {/* ── FRONT GRILLE & BUMPER ── */}
      {/* Front Radiator Grille (Dark multi-slat panel) */}
      <mesh position={[-4.67, 1.45, Z_center]} material={darkTrimMaterial} castShadow>
        <boxGeometry args={[0.08, 1.15, 1.8]} />
      </mesh>
      {/* Grille Chrome Center Badge */}
      <mesh position={[-4.72, 1.7, Z_center]} material={chromeMaterial}>
        <boxGeometry args={[0.04, 0.15, 0.35]} />
      </mesh>

      {/* Front Lower Bumper */}
      <mesh position={[-4.66, 0.65, Z_center]} material={darkTrimMaterial} castShadow>
        <boxGeometry args={[0.14, 0.5, 2.38]} />
      </mesh>

      {/* Headlights (Dual high-intensity LED light clusters) */}
      <mesh position={[-4.73, 0.75, Z_center - 0.88]}>
        <boxGeometry args={[0.04, 0.22, 0.36]} />
        <meshStandardMaterial color="#f8fafc" emissive="#38bdf8" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-4.73, 0.75, Z_center + 0.88]}>
        <boxGeometry args={[0.04, 0.22, 0.36]} />
        <meshStandardMaterial color="#f8fafc" emissive="#38bdf8" emissiveIntensity={0.8} />
      </mesh>

      {/* Side Boarding Steps */}
      <mesh position={[-3.65, 0.7, Z_center - 1.22]} material={darkTrimMaterial}>
        <boxGeometry args={[0.8, 0.3, 0.1]} />
      </mesh>
      <mesh position={[-3.65, 0.7, Z_center + 1.22]} material={darkTrimMaterial}>
        <boxGeometry args={[0.8, 0.3, 0.1]} />
      </mesh>

      {/* ── AERODYNAMIC DUAL SIDE MIRRORS ── */}
      <group position={[-4.3, 2.45, Z_center - 1.34]}>
        <mesh material={bodyMaterial}>
          <boxGeometry args={[0.12, 0.52, 0.16]} />
        </mesh>
        <mesh position={[-0.01, 0, 0.05]} material={glassMaterial}>
          <boxGeometry args={[0.1, 0.46, 0.02]} />
        </mesh>
      </group>
      <group position={[-4.3, 2.45, Z_center + 1.34]}>
        <mesh material={bodyMaterial}>
          <boxGeometry args={[0.12, 0.52, 0.16]} />
        </mesh>
        <mesh position={[-0.01, 0, -0.05]} material={glassMaterial}>
          <boxGeometry args={[0.1, 0.46, 0.02]} />
        </mesh>
      </group>
    </group>
  );
}

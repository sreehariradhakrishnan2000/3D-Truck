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
      {/* Outer Tire */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.52, isDual ? 0.48 : 0.28, 32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Outer Rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.34, isDual ? 0.49 : 0.29, 24]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Center Hub */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, isDual ? 0.52 : 0.31, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.5} />
      </mesh>
    </group>
  );
}

interface TruckCabin3DProps {
  trailerWidth: number; // meters
}

/**
 * High-fidelity 3D Semi-Truck Tractor Cabin matching the modern aerodynamic white cab in the reference image.
 * Attached at the front of the trailer (X < 0).
 */
export function TruckCabin3D({ trailerWidth }: TruckCabin3DProps) {
  const Z_center = trailerWidth / 2;

  // Glossy clean white paint for cabin body
  const bodyMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.2,
      metalness: 0.15,
    }),
    []
  );

  // Dark tinted glass for windshield and side windows
  const glassMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#090d16',
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.85,
    }),
    []
  );

  // Dark matte steel for chassis frame rails
  const chassisMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.7,
      metalness: 0.4,
    }),
    []
  );

  // Chrome / metallic for grille and trim
  const chromeMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.2,
      metalness: 0.85,
    }),
    []
  );

  return (
    <group position={[0, 0, 0]}>
      {/* ── CHASSIS FRAME RAILS (X: -4.8m to 0m) ── */}
      <mesh position={[-2.4, 0.6, Z_center]} material={chassisMaterial} castShadow>
        <boxGeometry args={[4.8, 0.22, 1.0]} />
      </mesh>

      {/* ── FIFTH WHEEL COUPLING (Hitch under trailer front) ── */}
      <group position={[-0.8, 0.75, Z_center]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.08, 24]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.6, 0.04, 0.5]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.8} />
        </mesh>
      </group>

      {/* ── WHEELS ── */}
      {/* Front Steering Axle (X: -4.3m) */}
      <Wheel position={[-4.3, 0.52, Z_center - 1.05]} />
      <Wheel position={[-4.3, 0.52, Z_center + 1.05]} />

      {/* Rear Tandem Axle 1 (X: -1.9m, Dual wheels) */}
      <Wheel position={[-1.9, 0.52, Z_center - 0.95]} isDual />
      <Wheel position={[-1.9, 0.52, Z_center + 0.95]} isDual />

      {/* Rear Tandem Axle 2 (X: -0.9m, Dual wheels) */}
      <Wheel position={[-0.9, 0.52, Z_center - 0.95]} isDual />
      <Wheel position={[-0.9, 0.52, Z_center + 0.95]} isDual />

      {/* ── FUEL TANKS (Cylinders between front & rear axles) ── */}
      <mesh position={[-3.1, 0.52, Z_center - 1.0]} rotation={[0, 0, Math.PI / 2]} material={chromeMaterial} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 1.4, 20]} />
      </mesh>
      <mesh position={[-3.1, 0.52, Z_center + 1.0]} rotation={[0, 0, Math.PI / 2]} material={chromeMaterial} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 1.4, 20]} />
      </mesh>

      {/* ── CABIN LOWER FAIRING / AERODYNAMIC SIDE SKIRTS ── */}
      <mesh position={[-2.8, 0.58, Z_center - 1.15]} material={bodyMaterial}>
        <boxGeometry args={[2.5, 0.45, 0.08]} />
      </mesh>
      <mesh position={[-2.8, 0.58, Z_center + 1.15]} material={bodyMaterial}>
        <boxGeometry args={[2.5, 0.45, 0.08]} />
      </mesh>

      {/* ── MAIN CABIN BODY (Sleeper Cab + Driver Cab) ── */}
      {/* Main Sleeper Box (Rear section of cab) */}
      <mesh position={[-2.0, 2.1, Z_center]} material={bodyMaterial} castShadow>
        <boxGeometry args={[2.0, 2.6, 2.4]} />
      </mesh>

      {/* Driver Cockpit Section */}
      <mesh position={[-3.5, 1.85, Z_center]} material={bodyMaterial} castShadow>
        <boxGeometry args={[1.5, 2.1, 2.36]} />
      </mesh>

      {/* Sloped Aerodynamic Front Hood / Engine Bay */}
      <mesh position={[-4.5, 1.35, Z_center]} material={bodyMaterial} castShadow>
        <boxGeometry args={[1.1, 1.15, 2.2]} />
      </mesh>

      {/* Curved Roof Aerodynamic Deflector / High-Roof Fairing */}
      <group position={[-2.4, 3.7, Z_center]}>
        <mesh material={bodyMaterial} castShadow>
          <boxGeometry args={[2.6, 0.65, 2.34]} />
        </mesh>
        {/* Sloped front curve */}
        <mesh position={[-0.8, -0.05, 0]} rotation={[0, 0, -0.35]} material={bodyMaterial}>
          <boxGeometry args={[1.2, 0.5, 2.32]} />
        </mesh>
      </group>

      {/* ── WINDSHIELD & WINDOWS ── */}
      {/* Slanted Front Windshield */}
      <mesh position={[-4.05, 2.3, Z_center]} rotation={[0, 0, -0.28]} material={glassMaterial}>
        <planeGeometry args={[2.1, 1.15]} />
      </mesh>

      {/* Left Door Window */}
      <mesh position={[-3.4, 2.25, Z_center - 1.19]} rotation={[0, -Math.PI / 2, 0]} material={glassMaterial}>
        <planeGeometry args={[0.02, 1.0]} />
      </mesh>

      {/* Right Door Window */}
      <mesh position={[-3.4, 2.25, Z_center + 1.19]} rotation={[0, Math.PI / 2, 0]} material={glassMaterial}>
        <planeGeometry args={[0.02, 1.0]} />
      </mesh>

      {/* Sleeper Side Windows */}
      <mesh position={[-2.1, 2.5, Z_center - 1.21]} rotation={[0, -Math.PI / 2, 0]} material={glassMaterial}>
        <planeGeometry args={[0.45, 0.6]} />
      </mesh>
      <mesh position={[-2.1, 2.5, Z_center + 1.21]} rotation={[0, Math.PI / 2, 0]} material={glassMaterial}>
        <planeGeometry args={[0.45, 0.6]} />
      </mesh>

      {/* ── FRONT GRILLE & BUMPER ── */}
      {/* Front Radiator Grille */}
      <mesh position={[-5.06, 1.25, Z_center]} rotation={[0, -Math.PI / 2, 0]} material={chromeMaterial}>
        <planeGeometry args={[1.6, 0.9]} />
      </mesh>
      {/* Front Lower Bumper */}
      <mesh position={[-5.02, 0.55, Z_center]} material={bodyMaterial} castShadow>
        <boxGeometry args={[0.25, 0.5, 2.4]} />
      </mesh>
      {/* High-Intensity LED Headlights */}
      <mesh position={[-5.06, 0.65, Z_center - 0.95]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.3, 0.2]} />
        <meshStandardMaterial color="#f8fafc" emissive="#38bdf8" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[-5.06, 0.65, Z_center + 0.95]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.3, 0.2]} />
        <meshStandardMaterial color="#f8fafc" emissive="#38bdf8" emissiveIntensity={0.6} />
      </mesh>

      {/* ── AERODYNAMIC SIDE MIRRORS ── */}
      <group position={[-4.1, 2.2, Z_center - 1.3]}>
        <mesh material={bodyMaterial}>
          <boxGeometry args={[0.12, 0.45, 0.16]} />
        </mesh>
        <mesh position={[-0.01, 0, 0.05]} material={chromeMaterial}>
          <planeGeometry args={[0.1, 0.4]} />
        </mesh>
      </group>
      <group position={[-4.1, 2.2, Z_center + 1.3]}>
        <mesh material={bodyMaterial}>
          <boxGeometry args={[0.12, 0.45, 0.16]} />
        </mesh>
        <mesh position={[-0.01, 0, -0.05]} material={chromeMaterial}>
          <planeGeometry args={[0.1, 0.4]} />
        </mesh>
      </group>
    </group>
  );
}

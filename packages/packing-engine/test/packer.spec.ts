import { describe, it, expect } from 'vitest';
import { GreedyPackingEngine } from '../src';
import type { PackingPackage, PackingRequest } from '@cargoflow/shared-types';

describe('GreedyPackingEngine', () => {
  const standardTrailer = {
    interiorLength: 13600,
    interiorWidth: 2450,
    interiorHeight: 2700,
    doorWidth: 2400,
    doorHeight: 2600,
    maxPayloadKg: 24000,
  };

  it('packs a single box at the origin (0,0,0)', () => {
    const engine = new GreedyPackingEngine();
    const pkg: PackingPackage = {
      loadPackageId: 'pkg-1',
      packageDefinitionId: 'def-1',
      length: 1200,
      width: 800,
      height: 1000,
      weightKg: 500,
      isFragile: false,
      isStackable: true,
      requiresUprightOrientation: false,
      requiresFloorSupport: false,
      allowedRotations: [0, 1, 2, 3, 4, 5],
      priority: 5,
    };

    const request: PackingRequest = {
      loadId: 'load-1',
      vehicleId: 'veh-1',
      trailer: standardTrailer,
      packages: [pkg],
    };

    const result = engine.run(request);
    expect(result.success).toBe(true);
    expect(result.placements).toHaveLength(1);
    expect(result.placements[0].x).toBe(0);
    expect(result.placements[0].y).toBe(0);
    expect(result.placements[0].z).toBe(0);
    expect(result.unplaced).toHaveLength(0);
    expect(result.volumeUtilizationPct).toBeGreaterThan(0);
  });

  it('packs multiple pallets next to each other on the floor', () => {
    const engine = new GreedyPackingEngine();
    const packages: PackingPackage[] = Array.from({ length: 4 }, (_, i) => ({
      loadPackageId: `pallet-${i + 1}`,
      packageDefinitionId: 'def-pallet',
      length: 1200,
      width: 800,
      height: 1400,
      weightKg: 400,
      isFragile: false,
      isStackable: true,
      requiresUprightOrientation: true,
      requiresFloorSupport: true,
      allowedRotations: [0, 2],
      priority: 5,
    }));

    const result = engine.run({
      loadId: 'load-2',
      vehicleId: 'veh-1',
      trailer: standardTrailer,
      packages,
    });

    expect(result.success).toBe(true);
    expect(result.placements).toHaveLength(4);
    // Ensure all 4 are on the floor (z=0) since requiresFloorSupport is true
    for (const p of result.placements) {
      expect(p.z).toBe(0);
    }
  });

  it('correctly marks oversized cargo as unplaced', () => {
    const engine = new GreedyPackingEngine();
    const hugePackage: PackingPackage = {
      loadPackageId: 'oversized-1',
      packageDefinitionId: 'def-huge',
      length: 20000, // Longer than trailer (13.6m)
      width: 3000,  // Wider than trailer (2.45m)
      height: 4000,
      weightKg: 10000,
      isFragile: false,
      isStackable: false,
      requiresUprightOrientation: false,
      requiresFloorSupport: false,
      allowedRotations: [0],
      priority: 10,
    };

    const result = engine.run({
      loadId: 'load-3',
      vehicleId: 'veh-1',
      trailer: standardTrailer,
      packages: [hugePackage],
    });

    expect(result.success).toBe(false);
    expect(result.unplaced).toHaveLength(1);
    expect(result.unplaced[0].loadPackageId).toBe('oversized-1');
  });
});

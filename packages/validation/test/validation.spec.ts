import { describe, it, expect } from 'vitest';
import {
  validateLoad,
  CreateVehicleSchema,
  CreatePackageDefinitionSchema,
  ValidatablePackage,
  ValidatableTrailer,
} from '../src';
import { ErrorCode, VehicleType } from '@cargoflow/shared-types';

describe('Validation Schemas (Zod)', () => {
  it('validates a correct vehicle definition', () => {
    const validVehicle = {
      name: 'Standard Semi-Trailer',
      type: VehicleType.SEMI_TRAILER,
      interiorLength: 13600,
      interiorWidth: 2450,
      interiorHeight: 2700,
      maxPayloadKg: 24000,
      doorWidth: 2400,
      doorHeight: 2600,
      isActive: true,
    };
    const parsed = CreateVehicleSchema.safeParse(validVehicle);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid vehicle definition with negative dimensions', () => {
    const invalidVehicle = {
      name: 'Bad Truck',
      type: VehicleType.BOX_TRUCK,
      interiorLength: -500,
      interiorWidth: 2400,
      interiorHeight: 2600,
      maxPayloadKg: 5000,
      doorWidth: 2000,
      doorHeight: 2000,
    };
    const parsed = CreateVehicleSchema.safeParse(invalidVehicle);
    expect(parsed.success).toBe(false);
  });

  it('validates package definition schema', () => {
    const validPkg = {
      name: 'Euro Pallet Heavy',
      sku: 'PAL-001',
      length: 1200,
      width: 800,
      height: 1400,
      weightKg: 650,
      isFragile: false,
      isStackable: true,
      allowedRotations: [0, 2],
    };
    const parsed = CreatePackageDefinitionSchema.safeParse(validPkg);
    expect(parsed.success).toBe(true);
  });
});

describe('Load Validator (validateLoad)', () => {
  const trailer: ValidatableTrailer = {
    interiorLength: 13600,
    interiorWidth: 2450,
    interiorHeight: 2700,
    doorWidth: 2400,
    doorHeight: 2600,
    maxPayloadKg: 24000,
  };

  it('passes validation for valid side-by-side placements', () => {
    const packages: ValidatablePackage[] = [
      {
        id: 'pkg-1',
        dims: { length: 1200, width: 800, height: 1000 },
        rotationIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        weightKg: 400,
        isStackable: true,
        isFragile: false,
        requiresFloorSupport: true,
        allowedRotations: [0, 2],
      },
      {
        id: 'pkg-2',
        dims: { length: 1200, width: 800, height: 1000 },
        rotationIndex: 0,
        position: { x: 1200, y: 0, z: 0 },
        weightKg: 400,
        isStackable: true,
        isFragile: false,
        requiresFloorSupport: true,
        allowedRotations: [0, 2],
      },
    ];

    const result = validateLoad(packages, trailer);
    expect(result.isValid).toBe(true);
    expect(result.collisionFree).toBe(true);
    expect(result.allSupported).toBe(true);
    expect(result.dimensionsValid).toBe(true);
    expect(result.weightValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('detects package collision when bounding boxes overlap', () => {
    const packages: ValidatablePackage[] = [
      {
        id: 'pkg-1',
        dims: { length: 1200, width: 800, height: 1000 },
        rotationIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        weightKg: 400,
        isStackable: true,
        isFragile: false,
        requiresFloorSupport: true,
        allowedRotations: [0, 2],
      },
      {
        id: 'pkg-2',
        dims: { length: 1200, width: 800, height: 1000 },
        rotationIndex: 0,
        position: { x: 500, y: 0, z: 0 }, // Overlaps with pkg-1 (0..1200)
        weightKg: 400,
        isStackable: true,
        isFragile: false,
        requiresFloorSupport: true,
        allowedRotations: [0, 2],
      },
    ];

    const result = validateLoad(packages, trailer);
    expect(result.isValid).toBe(false);
    expect(result.collisionFree).toBe(false);
    expect(result.issues.some((i) => i.code === ErrorCode.PACKAGE_COLLISION)).toBe(true);
  });

  it('detects package extending outside trailer boundaries', () => {
    const packages: ValidatablePackage[] = [
      {
        id: 'out-of-bounds',
        dims: { length: 2000, width: 1000, height: 1000 },
        rotationIndex: 0,
        position: { x: 13000, y: 0, z: 0 }, // 13000 + 2000 = 15000 > 13600
        weightKg: 500,
        isStackable: true,
        isFragile: false,
        requiresFloorSupport: true,
        allowedRotations: [0],
      },
    ];

    const result = validateLoad(packages, trailer);
    expect(result.isValid).toBe(false);
    expect(result.dimensionsValid).toBe(false);
    expect(result.issues.some((i) => i.code === ErrorCode.PACKAGE_OUTSIDE_TRAILER)).toBe(true);
  });

  it('detects floating package without support underneath', () => {
    const packages: ValidatablePackage[] = [
      {
        id: 'floating',
        dims: { length: 1000, width: 1000, height: 1000 },
        rotationIndex: 0,
        position: { x: 0, y: 0, z: 500 }, // Floating in mid-air
        weightKg: 300,
        isStackable: true,
        isFragile: false,
        requiresFloorSupport: false,
        allowedRotations: [0],
      },
    ];

    const result = validateLoad(packages, trailer);
    expect(result.isValid).toBe(false);
    expect(result.allSupported).toBe(false);
    expect(result.issues.some((i) => i.code === ErrorCode.PACKAGE_NOT_SUPPORTED)).toBe(true);
  });

  it('detects trailer maximum payload weight exceeded', () => {
    const packages: ValidatablePackage[] = [
      {
        id: 'heavy-1',
        dims: { length: 1000, width: 1000, height: 1000 },
        rotationIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        weightKg: 25000, // Exceeds 24000 kg capacity
        isStackable: true,
        isFragile: false,
        requiresFloorSupport: true,
        allowedRotations: [0],
      },
    ];

    const result = validateLoad(packages, trailer);
    expect(result.isValid).toBe(false);
    expect(result.weightValid).toBe(false);
    expect(result.issues.some((i) => i.code === ErrorCode.TRAILER_WEIGHT_EXCEEDED)).toBe(true);
  });
});

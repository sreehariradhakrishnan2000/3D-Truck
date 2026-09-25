import { describe, it, expect } from 'vitest';
import {
  addVec3,
  subVec3,
  scaleVec3,
  dotVec3,
  magnitudeVec3,
  applyRotation,
  getAllRotations,
  getUprightRotations,
  makeBoundingBox,
  aabbIntersects,
  aabbContainedIn,
  aabbVolume,
  aabbCenter,
  aabbOverlapVolume,
  buildPlacedItem,
  buildTrailerSpace,
  checkCollisions,
  checkContainment,
  checkDoorClearance,
  isItemSupported,
  calculateCenterOfGravity,
  calculateVolumeUtilization,
  checkDeliveryAccessibility,
} from '../src';
import type { Dimensions3D, RotationIndex, Vector3 } from '@cargoflow/shared-types';

describe('Vector3 Operations', () => {
  it('adds vectors correctly', () => {
    const a: Vector3 = { x: 100, y: 200, z: 300 };
    const b: Vector3 = { x: 50, y: -50, z: 25 };
    expect(addVec3(a, b)).toEqual({ x: 150, y: 150, z: 325 });
  });

  it('subtracts vectors correctly', () => {
    const a: Vector3 = { x: 100, y: 200, z: 300 };
    const b: Vector3 = { x: 40, y: 50, z: 60 };
    expect(subVec3(a, b)).toEqual({ x: 60, y: 150, z: 240 });
  });

  it('scales vectors correctly', () => {
    const v: Vector3 = { x: 10, y: 20, z: 30 };
    expect(scaleVec3(v, 2.5)).toEqual({ x: 25, y: 50, z: 75 });
  });

  it('computes dot product and magnitude', () => {
    const a: Vector3 = { x: 3, y: 4, z: 0 };
    expect(magnitudeVec3(a)).toBe(5);
    const b: Vector3 = { x: 1, y: 2, z: 3 };
    expect(dotVec3(a, b)).toBe(11);
  });
});

describe('Rotations', () => {
  const dims: Dimensions3D = { length: 1200, width: 800, height: 600 };

  it('generates 6 unique rotational permutations', () => {
    const all = getAllRotations(dims);
    expect(all).toHaveLength(6);
    expect(all[0]).toEqual({ length: 1200, width: 800, height: 600 });
    expect(all[1]).toEqual({ length: 1200, width: 600, height: 800 });
    expect(all[2]).toEqual({ length: 800, width: 1200, height: 600 });
  });

  it('getUprightRotations restricts to orientations where height remains vertical', () => {
    const upright = getUprightRotations(dims);
    expect(upright).toHaveLength(2);
    for (const rot of upright) {
      expect(rot.effective.height).toBe(600);
    }
  });
});

describe('AABB & Collision Detection', () => {
  it('creates correct bounding boxes', () => {
    const bbox = makeBoundingBox({ x: 100, y: 200, z: 0 }, { length: 500, width: 400, height: 300 });
    expect(bbox.min).toEqual({ x: 100, y: 200, z: 0 });
    expect(bbox.max).toEqual({ x: 600, y: 600, z: 300 });
    expect(aabbVolume(bbox)).toBe(500 * 400 * 300);
    expect(aabbCenter(bbox)).toEqual({ x: 350, y: 400, z: 150 });
  });

  it('detects intersecting and non-intersecting boxes', () => {
    const boxA = makeBoundingBox({ x: 0, y: 0, z: 0 }, { length: 1000, width: 1000, height: 1000 });
    const boxB = makeBoundingBox({ x: 500, y: 500, z: 500 }, { length: 1000, width: 1000, height: 1000 });
    const boxC = makeBoundingBox({ x: 2000, y: 2000, z: 0 }, { length: 500, width: 500, height: 500 });

    expect(aabbIntersects(boxA, boxB)).toBe(true);
    expect(aabbIntersects(boxA, boxC)).toBe(false);
    expect(aabbOverlapVolume(boxA, boxB)).toBe(500 * 500 * 500);
  });

  it('detects containment inside trailer space', () => {
    const trailer = buildTrailerSpace(13600, 2450, 2700);
    const itemInside = buildPlacedItem('item-1', { x: 0, y: 0, z: 0 }, { length: 1200, width: 800, height: 1000 }, 0);
    const itemOutside = buildPlacedItem('item-2', { x: 13000, y: 0, z: 0 }, { length: 1200, width: 800, height: 1000 }, 0);

    expect(checkContainment(itemInside, trailer)).toBe(true);
    expect(checkContainment(itemOutside, trailer)).toBe(false);
  });

  it('checks door clearance limits', () => {
    const fits = checkDoorClearance({ length: 1200, width: 1000, height: 800 }, 0, 2400, 2600);
    const tooTall = checkDoorClearance({ length: 1200, width: 1000, height: 3000 }, 0, 2400, 2600);
    expect(fits).toBe(true);
    expect(tooTall).toBe(false);
  });
});

describe('Support & Stacking', () => {
  it('items on the trailer floor are always supported', () => {
    const floorItem = buildPlacedItem('floor-1', { x: 0, y: 0, z: 0 }, { length: 1000, width: 1000, height: 500 }, 0);
    expect(isItemSupported(floorItem, [])).toBe(true);
  });

  it('stacked item is supported if placed directly on top of another item', () => {
    const base = buildPlacedItem('base', { x: 0, y: 0, z: 0 }, { length: 1000, width: 1000, height: 500 }, 0);
    const stacked = buildPlacedItem('stacked', { x: 0, y: 0, z: 500 }, { length: 1000, width: 1000, height: 500 }, 0);
    expect(isItemSupported(stacked, [base])).toBe(true);
  });

  it('floating item in mid-air is not supported', () => {
    const floating = buildPlacedItem('floating', { x: 0, y: 0, z: 200 }, { length: 1000, width: 1000, height: 500 }, 0);
    expect(isItemSupported(floating, [])).toBe(false);
  });
});

describe('Weight Distribution and Center of Gravity', () => {
  it('calculates symmetrical center of gravity', () => {
    const item1 = buildPlacedItem('1', { x: 0, y: 0, z: 0 }, { length: 1000, width: 1000, height: 500 }, 0);
    const item2 = buildPlacedItem('2', { x: 3000, y: 0, z: 0 }, { length: 1000, width: 1000, height: 500 }, 0);

    const weights = new Map<string, number>([
      ['1', 100],
      ['2', 100],
    ]);

    const cog = calculateCenterOfGravity([item1, item2], weights, 10000, 2400);
    expect(cog.totalWeightKg).toBe(200);
    // Center of item1 = 500, Center of item2 = 3500. Midpoint = 2000
    expect(cog.centerOfGravity.x).toBe(2000);
  });
});

describe('Delivery Accessibility & Multi-Stop LIFO', () => {
  it('detects when later stop cargo blocks earlier stop cargo from exit', () => {
    const items = [
      {
        id: 'stop-1-pkg',
        bbox: makeBoundingBox({ x: 0, y: 0, z: 0 }, { length: 1000, width: 1000, height: 1000 }),
        stopSequence: 1, // Deep in trailer, needs to exit first
      },
      {
        id: 'stop-2-pkg',
        bbox: makeBoundingBox({ x: 1500, y: 0, z: 0 }, { length: 1000, width: 1000, height: 1000 }),
        stopSequence: 2, // Placed closer to the door, blocking stop 1
      },
    ];

    const issues = checkDeliveryAccessibility(items);
    expect(issues).toHaveLength(1);
    expect(issues[0].blockedPackageId).toBe('stop-1-pkg');
    expect(issues[0].blockingPackageId).toBe('stop-2-pkg');
  });

  it('allows unobstructed cargo where earlier stop cargo is closest to door', () => {
    const items = [
      {
        id: 'stop-2-pkg',
        bbox: makeBoundingBox({ x: 0, y: 0, z: 0 }, { length: 1000, width: 1000, height: 1000 }),
        stopSequence: 2, // Deep near front wall
      },
      {
        id: 'stop-1-pkg',
        bbox: makeBoundingBox({ x: 1500, y: 0, z: 0 }, { length: 1000, width: 1000, height: 1000 }),
        stopSequence: 1, // Near rear door, easily accessible
      },
    ];

    const issues = checkDeliveryAccessibility(items);
    expect(issues).toHaveLength(0);
  });
});


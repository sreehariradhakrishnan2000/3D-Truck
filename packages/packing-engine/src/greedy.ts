import {
  PackingRequest,
  PackingResult,
  PackingPackage,
  PackingPlacement,
  UnplacedPackage,
  ErrorCode,
} from '@cargoflow/shared-types';
import type { RotationIndex } from '@cargoflow/shared-types';
import {
  buildPlacedItem,
  buildTrailerSpace,
  checkCollisions,
  checkContainment,
  isItemSupported,
  applyRotation,
  calculateCenterOfGravity,
  calculateVolumeUtilization,
} from '@cargoflow/geometry';
import type { PlacedItem } from '@cargoflow/geometry';

/**
 * Greedy 3D bin-packing algorithm using the "Extreme Point" strategy.
 *
 * Algorithm outline:
 * 1. Sort packages by priority (desc), then volume (desc) — heaviest first.
 * 2. Maintain a set of "extreme points" — candidate positions where a new box
 *    can be placed: initially just {0,0,0}, then updated after each placement.
 * 3. For each package, try every allowed rotation at each extreme point.
 * 4. Score each valid position and pick the best one (lowest Z → lowest Y → lowest X).
 * 5. After placing, add new extreme points along each axis edge of the placed item.
 * 6. Packages that cannot be placed are recorded as "unplaced".
 */
export class GreedyPackingEngine {
  private placedItems: PlacedItem[] = [];
  private extremePoints: Array<{ x: number; y: number; z: number }> = [{ x: 0, y: 0, z: 0 }];

  run(request: PackingRequest): PackingResult {
    const startMs = Date.now();
    const trailer = buildTrailerSpace(
      request.trailer.interiorLength,
      request.trailer.interiorWidth,
      request.trailer.interiorHeight,
    );

    // Sort: upright-required first, then by priority desc, then volume desc
    const sorted = [...request.packages].sort((a, b) => {
      if (a.requiresUprightOrientation !== b.requiresUprightOrientation)
        return a.requiresUprightOrientation ? -1 : 1;
      if (b.priority !== a.priority) return b.priority - a.priority;
      const volA = a.length * a.width * a.height;
      const volB = b.length * b.width * b.height;
      return volB - volA;
    });

    const placements: PackingPlacement[] = [];
    const unplaced: UnplacedPackage[] = [];
    const weightsMap = new Map<string, number>();

    for (const pkg of sorted) {
      const placed = this.tryPlace(pkg, trailer);
      if (placed) {
        placements.push(placed);
        weightsMap.set(pkg.loadPackageId, pkg.weightKg);
      } else {
        unplaced.push({
          loadPackageId: pkg.loadPackageId,
          reason: 'No valid position found in trailer',
          code: ErrorCode.PACKAGE_OUTSIDE_TRAILER,
        });
      }
    }

    const trailerVolume =
      request.trailer.interiorLength *
      request.trailer.interiorWidth *
      request.trailer.interiorHeight;

    const { utilizationPct: volumeUtilizationPct } = calculateVolumeUtilization(
      this.placedItems,
      trailerVolume,
    );

    const cogResult = calculateCenterOfGravity(
      this.placedItems,
      weightsMap,
      request.trailer.interiorLength,
      request.trailer.interiorWidth,
    );

    const totalWeight = [...weightsMap.values()].reduce((s, w) => s + w, 0);

    return {
      success: unplaced.length === 0,
      placements,
      unplaced,
      volumeUtilizationPct,
      weightUtilizationPct:
        request.trailer.maxPayloadKg > 0
          ? (totalWeight / request.trailer.maxPayloadKg) * 100
          : 0,
      weightDistribution: {
        totalWeightKg: cogResult.totalWeightKg,
        centerOfGravity: cogResult.centerOfGravity,
        weightUtilizationPct:
          request.trailer.maxPayloadKg > 0
            ? (cogResult.totalWeightKg / request.trailer.maxPayloadKg) * 100
            : 0,
        frontRearRatio: cogResult.frontRearRatio,
        leftRightRatio: cogResult.leftRightRatio,
      },
      warnings: [],
      durationMs: Date.now() - startMs,
    };
  }

  private tryPlace(
    pkg: PackingPackage,
    trailer: ReturnType<typeof buildTrailerSpace>,
  ): PackingPlacement | null {
    const dims = { length: pkg.length, width: pkg.width, height: pkg.height };
    const rotations = pkg.requiresUprightOrientation
      ? ([0, 2] as RotationIndex[]).filter((r) => pkg.allowedRotations.includes(r))
      : (pkg.allowedRotations as RotationIndex[]);

    let best: { point: { x: number; y: number; z: number }; rotIndex: RotationIndex } | null = null;
    let bestScore = Infinity;

    for (const ep of this.extremePoints) {
      for (const rotIndex of rotations) {
        const effective = applyRotation(dims, rotIndex);
        const item = buildPlacedItem(
          pkg.loadPackageId,
          { x: ep.x, y: ep.y, z: ep.z },
          dims,
          rotIndex,
        );

        if (pkg.requiresFloorSupport && ep.z > 0) continue;
        if (!checkContainment(item, trailer)) continue;
        const collision = checkCollisions(item, this.placedItems);
        if (collision.hasCollision) continue;
        if (!isItemSupported(item, this.placedItems)) continue;

        // Score: pack floor-first (lowest Z), then along width (lowest Y), then length (lowest X)
        const score = ep.z * 1e12 + ep.y * 1e6 + ep.x;
        if (score < bestScore) {
          bestScore = score;
          best = { point: ep, rotIndex };
        }
      }
    }

    if (!best) return null;

    const effective = applyRotation(dims, best.rotIndex);
    const placedItem = buildPlacedItem(
      pkg.loadPackageId,
      { x: best.point.x, y: best.point.y, z: best.point.z },
      dims,
      best.rotIndex,
    );

    this.placedItems.push(placedItem);
    this.addExtremePoints(placedItem, trailer);

    return {
      loadPackageId: pkg.loadPackageId,
      x: best.point.x,
      y: best.point.y,
      z: best.point.z,
      rotationIndex: best.rotIndex,
      effectiveDimensions: effective,
    };
  }

  /** Add new candidate extreme points at the bounding box projection edges */
  private addExtremePoints(
    item: PlacedItem,
    trailer: ReturnType<typeof buildTrailerSpace>,
  ) {
    const candidates = [
      { x: item.bbox.max.x, y: item.bbox.min.y, z: item.bbox.min.z },
      { x: item.bbox.min.x, y: item.bbox.max.y, z: item.bbox.min.z },
      { x: item.bbox.min.x, y: item.bbox.min.y, z: item.bbox.max.z },
    ];

    for (const c of candidates) {
      // Must be within trailer bounds
      if (
        c.x >= trailer.bbox.max.x ||
        c.y >= trailer.bbox.max.y ||
        c.z >= trailer.bbox.max.z
      ) {
        continue;
      }

      // Must not be strictly inside any existing placed box
      const isInside = this.placedItems.some(
        (pi) =>
          c.x >= pi.bbox.min.x &&
          c.x < pi.bbox.max.x &&
          c.y >= pi.bbox.min.y &&
          c.y < pi.bbox.max.y &&
          c.z >= pi.bbox.min.z &&
          c.z < pi.bbox.max.z,
      );
      if (isInside) continue;

      // Deduplicate
      const exists = this.extremePoints.some(
        (ep) => ep.x === c.x && ep.y === c.y && ep.z === c.z,
      );
      if (!exists) {
        this.extremePoints.push(c);
      }
    }
  }
}

export function runPackingEngine(request: PackingRequest): PackingResult {
  const engine = new GreedyPackingEngine();
  return engine.run(request);
}


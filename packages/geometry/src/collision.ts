import type { BoundingBox, Dimensions3D, RotationIndex, Vector3 } from '@cargoflow/shared-types';
import { makeBoundingBox, aabbIntersects, aabbContainedIn } from './aabb';
import { applyRotation } from './rotations';

export interface PlacedItem {
  id: string;
  position: Vector3;
  dims: Dimensions3D;
  rotationIndex: RotationIndex;
  effectiveDims: Dimensions3D;
  bbox: BoundingBox;
}

export function buildPlacedItem(
  id: string,
  position: Vector3,
  dims: Dimensions3D,
  rotationIndex: RotationIndex,
): PlacedItem {
  const effectiveDims = applyRotation(dims, rotationIndex);
  const bbox = makeBoundingBox(position, effectiveDims);
  return { id, position, dims, rotationIndex, effectiveDims, bbox };
}

export interface TrailerSpace {
  bbox: BoundingBox;
}

export function buildTrailerSpace(length: number, width: number, height: number): TrailerSpace {
  return {
    bbox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: length, y: width, z: height },
    },
  };
}

export interface CollisionCheckResult {
  hasCollision: boolean;
  conflictingIds: string[];
}

/**
 * Check if a candidate item collides with any existing placed items.
 */
export function checkCollisions(
  candidate: PlacedItem,
  placedItems: PlacedItem[],
): CollisionCheckResult {
  const conflictingIds: string[] = [];
  for (const item of placedItems) {
    if (item.id === candidate.id) continue;
    if (aabbIntersects(candidate.bbox, item.bbox)) {
      conflictingIds.push(item.id);
    }
  }
  return { hasCollision: conflictingIds.length > 0, conflictingIds };
}

/**
 * Check if item is fully inside the trailer.
 */
export function checkContainment(
  item: PlacedItem,
  trailer: TrailerSpace,
): boolean {
  return aabbContainedIn(item.bbox, trailer.bbox);
}

/**
 * Check if a package can fit through the rear door.
 * Door is at x=trailerLength, spanning y=[0..doorWidth], z=[0..doorHeight].
 */
export function checkDoorClearance(
  dims: Dimensions3D,
  rotationIndex: RotationIndex,
  doorWidth: number,
  doorHeight: number,
): boolean {
  const effective = applyRotation(dims, rotationIndex);
  return effective.width <= doorWidth && effective.height <= doorHeight;
}

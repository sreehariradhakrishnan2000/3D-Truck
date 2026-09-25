import type { BoundingBox, Dimensions3D, Vector3 } from '@cargoflow/shared-types';

export function makeBoundingBox(position: Vector3, dims: Dimensions3D): BoundingBox {
  return {
    min: { x: position.x, y: position.y, z: position.z },
    max: {
      x: position.x + dims.length,
      y: position.y + dims.width,
      z: position.z + dims.height,
    },
  };
}

/**
 * Returns true if two AABBs intersect (share any volume).
 * Touching faces/edges are NOT considered intersecting.
 */
export function aabbIntersects(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.min.x < b.max.x &&
    a.max.x > b.min.x &&
    a.min.y < b.max.y &&
    a.max.y > b.min.y &&
    a.min.z < b.max.z &&
    a.max.z > b.min.z
  );
}

/**
 * Returns true if inner is fully contained within outer.
 */
export function aabbContainedIn(inner: BoundingBox, outer: BoundingBox): boolean {
  return (
    inner.min.x >= outer.min.x &&
    inner.max.x <= outer.max.x &&
    inner.min.y >= outer.min.y &&
    inner.max.y <= outer.max.y &&
    inner.min.z >= outer.min.z &&
    inner.max.z <= outer.max.z
  );
}

export function aabbVolume(box: BoundingBox): number {
  return (
    (box.max.x - box.min.x) *
    (box.max.y - box.min.y) *
    (box.max.z - box.min.z)
  );
}

export function aabbCenter(box: BoundingBox): Vector3 {
  return {
    x: (box.min.x + box.max.x) / 2,
    y: (box.min.y + box.max.y) / 2,
    z: (box.min.z + box.max.z) / 2,
  };
}

/**
 * Returns the overlap volume between two intersecting AABBs, or 0.
 */
export function aabbOverlapVolume(a: BoundingBox, b: BoundingBox): number {
  const ox = Math.max(0, Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x));
  const oy = Math.max(0, Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y));
  const oz = Math.max(0, Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z));
  return ox * oy * oz;
}

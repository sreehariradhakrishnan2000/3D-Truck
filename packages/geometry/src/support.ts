import type { BoundingBox } from '@cargoflow/shared-types';
import type { PlacedItem } from './collision';

/** Minimum fraction of base area that must be supported (0.0 to 1.0) */
const MIN_SUPPORT_FRACTION = 0.2;

/**
 * Returns the overlap area in the XY (horizontal) plane between two items.
 */
function xyOverlapArea(a: BoundingBox, b: BoundingBox): number {
  const ox = Math.max(0, Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x));
  const oy = Math.max(0, Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y));
  return ox * oy;
}

/**
 * Determines whether a placed item is properly supported.
 * An item is supported if:
 *  - Its bottom face (z=min.z) is on the trailer floor (z=0), OR
 *  - At least MIN_SUPPORT_FRACTION of its base area is covered by items immediately below.
 */
export function isItemSupported(
  item: PlacedItem,
  allItems: PlacedItem[],
  tolerance = 1, // mm tolerance for floating-point
): boolean {
  // Resting on the floor?
  if (item.bbox.min.z <= tolerance) return true;

  const baseArea = item.effectiveDims.length * item.effectiveDims.width;
  if (baseArea <= 0) return true;

  let supportedArea = 0;

  for (const other of allItems) {
    if (other.id === item.id) continue;
    // other must be directly below: other.max.z ≈ item.min.z
    if (Math.abs(other.bbox.max.z - item.bbox.min.z) > tolerance) continue;
    supportedArea += xyOverlapArea(item.bbox, other.bbox);
  }

  return supportedArea / baseArea >= MIN_SUPPORT_FRACTION;
}

/**
 * Returns the total weight placed on top of an item (directly or transitively).
 * Used for stack weight validation.
 */
export function getStackWeightAbove(
  item: PlacedItem,
  allItems: PlacedItem[],
  weights: Map<string, number>,
  tolerance = 1,
): number {
  let total = 0;
  for (const other of allItems) {
    if (other.id === item.id) continue;
    if (Math.abs(other.bbox.min.z - item.bbox.max.z) > tolerance) continue;
    const overlap = xyOverlapArea(item.bbox, other.bbox);
    if (overlap > 0) {
      total += weights.get(other.id) ?? 0;
    }
  }
  return total;
}

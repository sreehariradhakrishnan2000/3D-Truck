import type { Vector3 } from '@cargoflow/shared-types';
import type { PlacedItem } from './collision';

export interface CogResult {
  centerOfGravity: Vector3;
  totalWeightKg: number;
  /** Fraction 0..1, 0.5 = perfectly centred front-rear (along X) */
  frontRearRatio: number;
  /** Fraction 0..1, 0.5 = perfectly centred left-right (along Y) */
  leftRightRatio: number;
}

export function calculateCenterOfGravity(
  items: PlacedItem[],
  weights: Map<string, number>,
  trailerLength: number,
  trailerWidth: number,
): CogResult {
  let totalWeight = 0;
  let wxSum = 0;
  let wySum = 0;
  let wzSum = 0;

  for (const item of items) {
    const w = weights.get(item.id) ?? 0;
    const cx = (item.bbox.min.x + item.bbox.max.x) / 2;
    const cy = (item.bbox.min.y + item.bbox.max.y) / 2;
    const cz = (item.bbox.min.z + item.bbox.max.z) / 2;
    totalWeight += w;
    wxSum += w * cx;
    wySum += w * cy;
    wzSum += w * cz;
  }

  if (totalWeight === 0) {
    return {
      centerOfGravity: { x: trailerLength / 2, y: trailerWidth / 2, z: 0 },
      totalWeightKg: 0,
      frontRearRatio: 0.5,
      leftRightRatio: 0.5,
    };
  }

  const cog: Vector3 = {
    x: wxSum / totalWeight,
    y: wySum / totalWeight,
    z: wzSum / totalWeight,
  };

  return {
    centerOfGravity: cog,
    totalWeightKg: totalWeight,
    frontRearRatio: cog.x / trailerLength,
    leftRightRatio: cog.y / trailerWidth,
  };
}

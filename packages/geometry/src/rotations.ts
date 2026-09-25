import type { Dimensions3D, RotationIndex } from '@cargoflow/shared-types';

/**
 * The 6 axis-aligned orientations of a box (L×W×H).
 * Each tuple is [effective_length, effective_width, effective_height]
 * mapped to the trailer coordinate axes [X, Y, Z].
 *
 * Coordinate system:
 *   X = trailer length (front to back)
 *   Y = trailer width (left to right)
 *   Z = vertical height (floor to ceiling)
 */
const ROTATION_MATRIX: [keyof Dimensions3D, keyof Dimensions3D, keyof Dimensions3D][] = [
  ['length', 'width',  'height'], // 0: default
  ['length', 'height', 'width'],  // 1: rotated 90° around X
  ['width',  'length', 'height'], // 2: rotated 90° around Z
  ['width',  'height', 'length'], // 3: rotated 90° around Z + 90° around X
  ['height', 'length', 'width'],  // 4: rotated 90° around Y
  ['height', 'width',  'length'], // 5: rotated 90° around Y + 90° around Z
];

export function applyRotation(dims: Dimensions3D, rotIndex: RotationIndex): Dimensions3D {
  const [lKey, wKey, hKey] = ROTATION_MATRIX[rotIndex];
  return {
    length: dims[lKey],
    width: dims[wKey],
    height: dims[hKey],
  };
}

export function getRotationMatrix(): typeof ROTATION_MATRIX {
  return ROTATION_MATRIX;
}

export function getAllRotations(dims: Dimensions3D): Dimensions3D[] {
  return (Array.from({ length: 6 }, (_, i) => applyRotation(dims, i as RotationIndex)));
}

export function getUprightRotations(dims: Dimensions3D): { rotIndex: RotationIndex; effective: Dimensions3D }[] {
  // Upright = original height must remain as the Z axis
  return ([0, 2] as RotationIndex[]).map((rotIndex) => ({
    rotIndex,
    effective: applyRotation(dims, rotIndex),
  }));
}

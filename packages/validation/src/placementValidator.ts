import {
  ErrorCode,
  RotationIndex,
  ValidationIssue,
  ValidationResult,
} from '@cargoflow/shared-types';
import {
  PlacedItem,
  TrailerSpace,
  buildPlacedItem,
  buildTrailerSpace,
  checkCollisions,
  checkContainment,
  checkDoorClearance,
  isItemSupported,
  getStackWeightAbove,
  calculateCenterOfGravity,
  calculateVolumeUtilization,
} from '@cargoflow/geometry';
import type { Dimensions3D } from '@cargoflow/shared-types';

export interface ValidatablePackage {
  id: string; // loadPackageId
  dims: Dimensions3D;
  rotationIndex: RotationIndex;
  position: { x: number; y: number; z: number };
  weightKg: number;
  isStackable: boolean;
  isFragile: boolean;
  requiresFloorSupport: boolean;
  maxStackWeightKg?: number;
  stopSequence?: number;
  allowedRotations: RotationIndex[];
}

export interface ValidatableTrailer {
  interiorLength: number;
  interiorWidth: number;
  interiorHeight: number;
  doorWidth: number;
  doorHeight: number;
  maxPayloadKg: number;
}

export function validateLoad(
  packages: ValidatablePackage[],
  trailer: ValidatableTrailer,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  const trailerSpace = buildTrailerSpace(
    trailer.interiorLength,
    trailer.interiorWidth,
    trailer.interiorHeight,
  );

  // Build placed items
  const placedItems: PlacedItem[] = packages.map((pkg) =>
    buildPlacedItem(pkg.id, pkg.position, pkg.dims, pkg.rotationIndex),
  );

  const weightsMap = new Map(packages.map((p) => [p.id, p.weightKg]));

  let collisionFree = true;
  let allSupported = true;
  let stackabilityValid = true;
  let doorClearanceValid = true;
  let dimensionsValid = true;
  let weightValid = true;
  let deliveryAccessibilityWarnings = 0;

  for (let i = 0; i < placedItems.length; i++) {
    const item = placedItems[i];
    const pkg = packages[i];

    // Containment
    if (!checkContainment(item, trailerSpace)) {
      dimensionsValid = false;
      issues.push({
        code: ErrorCode.PACKAGE_OUTSIDE_TRAILER,
        severity: 'error',
        message: `Package ${pkg.id} extends outside the trailer boundaries.`,
        packageId: pkg.id,
      });
    }

    // Collision
    const collision = checkCollisions(item, placedItems);
    if (collision.hasCollision) {
      collisionFree = false;
      for (const conflictId of collision.conflictingIds) {
        issues.push({
          code: ErrorCode.PACKAGE_COLLISION,
          severity: 'error',
          message: `Package ${pkg.id} overlaps with package ${conflictId}.`,
          packageId: pkg.id,
          conflictingPackageId: conflictId,
        });
      }
    }

    // Rotation allowed
    if (!pkg.allowedRotations.includes(pkg.rotationIndex)) {
      issues.push({
        code: ErrorCode.INVALID_ROTATION,
        severity: 'error',
        message: `Rotation ${pkg.rotationIndex} is not allowed for package ${pkg.id}.`,
        packageId: pkg.id,
      });
    }

    // Door clearance
    if (!checkDoorClearance(pkg.dims, pkg.rotationIndex, trailer.doorWidth, trailer.doorHeight)) {
      doorClearanceValid = false;
      issues.push({
        code: ErrorCode.DOOR_CLEARANCE_FAILED,
        severity: 'error',
        message: `Package ${pkg.id} in rotation ${pkg.rotationIndex} cannot fit through the trailer door.`,
        packageId: pkg.id,
      });
    }

    // Support
    if (!isItemSupported(item, placedItems)) {
      allSupported = false;
      issues.push({
        code: ErrorCode.PACKAGE_NOT_SUPPORTED,
        severity: 'error',
        message: `Package ${pkg.id} is not adequately supported from below.`,
        packageId: pkg.id,
      });
    }

    // Stackability: check if non-stackable item has something on top
    if (!pkg.isStackable) {
      const above = getStackWeightAbove(item, placedItems, weightsMap);
      if (above > 0) {
        stackabilityValid = false;
        issues.push({
          code: ErrorCode.NON_STACKABLE,
          severity: 'error',
          message: `Package ${pkg.id} is marked non-stackable but has cargo stacked on top.`,
          packageId: pkg.id,
        });
      }
    }

    // Max stack weight
    if (pkg.maxStackWeightKg !== undefined) {
      const above = getStackWeightAbove(item, placedItems, weightsMap);
      if (above > pkg.maxStackWeightKg) {
        issues.push({
          code: ErrorCode.NON_STACKABLE,
          severity: 'error',
          message: `Package ${pkg.id} supports ${above.toFixed(1)} kg but max is ${pkg.maxStackWeightKg} kg.`,
          packageId: pkg.id,
        });
      }
    }

    // Fragile: fragile items should not have anything on top
    if (pkg.isFragile) {
      const above = getStackWeightAbove(item, placedItems, weightsMap);
      if (above > 0) {
        issues.push({
          code: ErrorCode.NON_STACKABLE,
          severity: 'warning',
          message: `Fragile package ${pkg.id} has cargo stacked on top.`,
          packageId: pkg.id,
        });
      }
    }
  }

  // Weight validation
  const totalWeight = packages.reduce((s, p) => s + p.weightKg, 0);
  if (totalWeight > trailer.maxPayloadKg) {
    weightValid = false;
    issues.push({
      code: ErrorCode.TRAILER_WEIGHT_EXCEEDED,
      severity: 'error',
      message: `Trailer exceeds maximum payload by ${(totalWeight - trailer.maxPayloadKg).toFixed(1)} kg.`,
      details: { totalWeight, maxPayload: trailer.maxPayloadKg },
    });
  }

  // Volume utilization
  const trailerVolume = trailer.interiorLength * trailer.interiorWidth * trailer.interiorHeight;
  const { utilizationPct: volumeUtilizationPct } = calculateVolumeUtilization(placedItems, trailerVolume);

  // Center of gravity
  const cogResult = calculateCenterOfGravity(
    placedItems,
    weightsMap,
    trailer.interiorLength,
    trailer.interiorWidth,
  );

  const weightDistribution = {
    totalWeightKg: cogResult.totalWeightKg,
    centerOfGravity: cogResult.centerOfGravity,
    weightUtilizationPct: trailer.maxPayloadKg > 0 ? (cogResult.totalWeightKg / trailer.maxPayloadKg) * 100 : 0,
    frontRearRatio: cogResult.frontRearRatio,
    leftRightRatio: cogResult.leftRightRatio,
  };

  const isValid =
    dimensionsValid &&
    weightValid &&
    collisionFree &&
    allSupported &&
    stackabilityValid &&
    doorClearanceValid &&
    issues.filter((i) => i.severity === 'error').length === 0;

  return {
    isValid,
    issues,
    dimensionsValid,
    weightValid,
    collisionFree,
    allSupported,
    stackabilityValid,
    doorClearanceValid,
    weightDistribution,
    deliveryAccessibilityWarnings,
  };
}

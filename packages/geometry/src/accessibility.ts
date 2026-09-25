import type { BoundingBox } from '@cargoflow/shared-types';

export interface AccessibilityCheckItem {
  id: string;
  bbox: BoundingBox;
  stopSequence: number;
}

export interface AccessibilityIssue {
  blockedPackageId: string;
  blockingPackageId: string;
  blockedStop: number;
  blockingStop: number;
  message: string;
}

/**
 * Checks whether cargo scheduled for earlier delivery stops is physically
 * obstructed by cargo scheduled for later delivery stops on the path to the rear door (+X).
 *
 * Trailer coordinate system:
 * Front wall = x: 0
 * Rear door = x: trailerLength
 */
export function checkDeliveryAccessibility(
  items: AccessibilityCheckItem[],
): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];

  // Filter items that have a positive stop sequence defined
  const sequencedItems = items.filter(
    (item) => typeof item.stopSequence === 'number' && item.stopSequence > 0,
  );

  for (let i = 0; i < sequencedItems.length; i++) {
    const itemA = sequencedItems[i]; // Needs to be unloaded at stopSequence A

    for (let j = 0; j < sequencedItems.length; j++) {
      if (i === j) continue;
      const itemB = sequencedItems[j]; // Stop sequence B

      // If itemA is delivered BEFORE itemB (stop A < stop B)
      if (itemA.stopSequence < itemB.stopSequence) {
        // Item B blocks item A if B is towards the rear door (+X) relative to A
        const isBInFrontOfDoor = itemB.bbox.min.x >= itemA.bbox.min.x;

        if (isBInFrontOfDoor) {
          // Check if B overlaps with A's exit corridor in the YZ projection
          const yOverlap =
            Math.max(itemA.bbox.min.y, itemB.bbox.min.y) <
            Math.min(itemA.bbox.max.y, itemB.bbox.max.y);
          const zOverlap =
            Math.max(itemA.bbox.min.z, itemB.bbox.min.z) <
            Math.min(itemA.bbox.max.z, itemB.bbox.max.z);

          if (yOverlap && zOverlap) {
            issues.push({
              blockedPackageId: itemA.id,
              blockingPackageId: itemB.id,
              blockedStop: itemA.stopSequence,
              blockingStop: itemB.stopSequence,
              message: `Cargo for Stop ${itemA.stopSequence} is blocked from the rear door by Stop ${itemB.stopSequence} cargo.`,
            });
          }
        }
      }
    }
  }

  return issues;
}

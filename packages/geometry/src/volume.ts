import type { Dimensions3D } from '@cargoflow/shared-types';
import type { PlacedItem } from './collision';

export function dimVolume(dims: Dimensions3D): number {
  return dims.length * dims.width * dims.height;
}

export function calculateVolumeUtilization(
  items: PlacedItem[],
  trailerVolumeMm3: number,
): { cargoVolumeMm3: number; unusedVolumeMm3: number; utilizationPct: number } {
  const cargoVolumeMm3 = items.reduce(
    (sum, item) => sum + dimVolume(item.effectiveDims),
    0,
  );
  const unusedVolumeMm3 = trailerVolumeMm3 - cargoVolumeMm3;
  const utilizationPct =
    trailerVolumeMm3 > 0 ? (cargoVolumeMm3 / trailerVolumeMm3) * 100 : 0;
  return { cargoVolumeMm3, unusedVolumeMm3, utilizationPct };
}

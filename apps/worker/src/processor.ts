import { PrismaClient } from '@prisma/client';
import { runPackingEngine } from '@cargoflow/packing-engine';
import type { RotationIndex, PackingPackage } from '@cargoflow/shared-types';

export interface AutoPackJobData {
  loadId: string;
  organizationId: string;
  userId: string;
  strategy?: 'GREEDY' | 'BFD';
}

export async function processAutoPackJob(
  data: AutoPackJobData,
  prisma: PrismaClient,
  onProgress?: (progress: number, message: string) => Promise<void> | void
) {
  const { loadId, organizationId, userId } = data;

  if (onProgress) await onProgress(10, 'Fetching load details and vehicle dimensions...');

  const load = await prisma.load.findFirst({
    where: { id: loadId, organizationId },
    include: {
      vehicle: true,
      loadPackages: { include: { packageDefinition: true } },
    },
  });

  if (!load) {
    throw new Error(`Load ${loadId} not found`);
  }

  if (onProgress) await onProgress(25, 'Preparing cargo packages for 3D optimization...');

  const packages: PackingPackage[] = load.loadPackages.map((lp) => ({
    loadPackageId: lp.id,
    packageDefinitionId: lp.packageDefinitionId,
    length: lp.packageDefinition.length,
    width: lp.packageDefinition.width,
    height: lp.packageDefinition.height,
    weightKg: lp.packageDefinition.weightKg,
    isFragile: lp.packageDefinition.isFragile,
    isStackable: lp.packageDefinition.isStackable,
    requiresUprightOrientation: lp.packageDefinition.requiresUprightOrientation,
    requiresFloorSupport: lp.packageDefinition.requiresFloorSupport,
    allowedRotations: lp.packageDefinition.allowedRotations as RotationIndex[],
    stopSequence: lp.stopSequence ?? undefined,
    priority: lp.priority,
  }));

  if (onProgress) await onProgress(45, 'Running 3D bin packing engine...');

  const result = runPackingEngine({
    loadId,
    vehicleId: load.vehicle.id,
    trailer: {
      interiorLength: load.vehicle.interiorLength,
      interiorWidth: load.vehicle.interiorWidth,
      interiorHeight: load.vehicle.interiorHeight,
      doorWidth: load.vehicle.doorWidth,
      doorHeight: load.vehicle.doorHeight,
      maxPayloadKg: load.vehicle.maxPayloadKg,
    },
    packages,
  });

  if (onProgress) await onProgress(75, 'Computing optimal loading sequence...');

  // Sort placements for the physical loading sequence:
  // Items placed deepest inside (lowest X) and on the floor (lowest Z) must be loaded FIRST.
  const sortedForLoading = [...result.placements].sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x; // Deepest in trailer first
    if (a.z !== b.z) return a.z - b.z; // Bottom floor first
    return a.y - b.y;
  });

  if (onProgress) await onProgress(85, 'Writing placements and sequence to database...');

  // Commit placements and sequence atomically in a transaction
  await prisma.$transaction(async (tx) => {
    // 1. Delete existing placements and sequence items for this load
    await tx.loadingSequenceItem.deleteMany({ where: { loadId } });
    await tx.placement.deleteMany({ where: { loadId } });

    // 2. Insert new placements
    for (const p of result.placements) {
      await tx.placement.create({
        data: {
          loadId,
          loadPackageId: p.loadPackageId,
          x: p.x,
          y: p.y,
          z: p.z,
          rotationIndex: p.rotationIndex,
          createdById: userId,
          updatedById: userId,
        },
      });
      await tx.loadPackage.update({
        where: { id: p.loadPackageId },
        data: { status: 'PLACED' },
      });
    }

    // 3. Mark unplaced packages as UNPLACEABLE
    for (const u of result.unplaced) {
      await tx.loadPackage.update({
        where: { id: u.loadPackageId },
        data: { status: 'UNPLACEABLE' },
      });
    }

    // 4. Create loading sequence records
    for (let i = 0; i < sortedForLoading.length; i++) {
      const p = sortedForLoading[i];
      await tx.loadingSequenceItem.create({
        data: {
          loadId,
          loadPackageId: p.loadPackageId,
          sequenceOrder: i + 1,
          notes: `Step ${i + 1}: Place at X=${Math.round(p.x)}mm, Y=${Math.round(p.y)}mm, Z=${Math.round(p.z)}mm`,
        },
      });
    }

    // 5. Update load version, utilization, and validation
    await tx.load.update({
      where: { id: loadId },
      data: {
        version: { increment: 1 },
        volumeUtilizationPct: result.volumeUtilizationPct,
        weightUtilizationPct: result.weightUtilizationPct,
        validationPassed: result.success,
      },
    });
  });

  if (onProgress) await onProgress(100, 'Auto-pack optimization completed successfully.');

  return {
    success: result.success,
    placementsCount: result.placements.length,
    unplacedCount: result.unplaced.length,
    volumeUtilizationPct: result.volumeUtilizationPct,
    weightUtilizationPct: result.weightUtilizationPct,
  };
}

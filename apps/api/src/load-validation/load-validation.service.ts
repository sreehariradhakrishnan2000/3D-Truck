import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { validateLoad } from '@cargoflow/validation';
import type { ValidatablePackage, ValidatableTrailer } from '@cargoflow/validation';
import type { JwtPayload, RotationIndex } from '@cargoflow/shared-types';

@Injectable()
export class LoadValidationService {
  constructor(private prisma: PrismaService) {}

  async validateLoad(loadId: string, user: JwtPayload) {
    const load = await this.prisma.load.findFirst({
      where: { id: loadId, organizationId: user.orgId },
      include: {
        vehicle: true,
        loadPackages: {
          include: { packageDefinition: true, placements: true },
        },
      },
    });
    if (!load) throw new NotFoundException('Load not found');

    const trailer: ValidatableTrailer = {
      interiorLength: load.vehicle.interiorLength,
      interiorWidth: load.vehicle.interiorWidth,
      interiorHeight: load.vehicle.interiorHeight,
      doorWidth: load.vehicle.doorWidth,
      doorHeight: load.vehicle.doorHeight,
      maxPayloadKg: load.vehicle.maxPayloadKg,
    };

    const packages: ValidatablePackage[] = load.loadPackages
      .filter((lp) => lp.placements.length > 0)
      .map((lp) => {
        const p = lp.placements[0];
        const pkg = lp.packageDefinition;
        return {
          id: lp.id,
          dims: { length: pkg.length, width: pkg.width, height: pkg.height },
          rotationIndex: p.rotationIndex as RotationIndex,
          position: { x: p.x, y: p.y, z: p.z },
          weightKg: pkg.weightKg,
          isStackable: pkg.isStackable,
          isFragile: pkg.isFragile,
          requiresFloorSupport: pkg.requiresFloorSupport,
          maxStackWeightKg: pkg.maxStackWeightKg ?? undefined,
          stopSequence: lp.stopSequence ?? undefined,
          allowedRotations: pkg.allowedRotations as RotationIndex[],
        };
      });

    const result = validateLoad(packages, trailer);

    await this.prisma.load.update({
      where: { id: loadId },
      data: { validationPassed: result.isValid },
    });

    return result;
  }
}


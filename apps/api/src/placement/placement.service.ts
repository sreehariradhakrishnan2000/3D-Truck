import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePlacementDto } from '@cargoflow/validation';
import type { JwtPayload } from '@cargoflow/shared-types';
import { ErrorCode } from '@cargoflow/shared-types';
import {
  buildPlacedItem,
  buildTrailerSpace,
  checkCollisions,
  checkContainment,
} from '@cargoflow/geometry';
import type { Dimensions3D, RotationIndex } from '@cargoflow/shared-types';
import { LoadGateway } from '../websocket/load.gateway';
import { WS_EVENTS } from '@cargoflow/shared-types';

@Injectable()
export class PlacementService {
  constructor(
    private prisma: PrismaService,
    private loadGateway: LoadGateway,
  ) {}

  async getPlacements(loadId: string, user: JwtPayload) {
    const load = await this.prisma.load.findFirst({ where: { id: loadId, organizationId: user.orgId } });
    if (!load) throw new NotFoundException('Load not found');
    return this.prisma.placement.findMany({ where: { loadId } });
  }

  /**
   * Upsert a package placement with full concurrency protection.
   * Uses SELECT FOR UPDATE to lock the load row, then validates the version,
   * containment, and collision before writing.
   */
  async createOrUpdatePlacement(loadId: string, dto: CreatePlacementDto, user: JwtPayload) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Lock the load row
      const loads = await tx.$queryRaw<Array<{ id: string; version: number; vehicleId: string }>>`
        SELECT id, version, "vehicleId"
        FROM "Load"
        WHERE id = ${loadId} AND "organizationId" = ${user.orgId}
        FOR UPDATE
      `;
      const load = loads[0];
      if (!load) throw new NotFoundException('Load not found');

      // 2. Optimistic version check
      if (load.version !== dto.loadVersion) {
        throw new ConflictException({
          code: ErrorCode.STALE_LOAD_VERSION,
          message: 'Load was modified by someone else. Please refresh.',
          currentVersion: load.version,
        });
      }

      // 3. Verify load package belongs to this load
      const loadPackage = await tx.loadPackage.findFirst({
        where: { id: dto.loadPackageId, loadId },
        include: { packageDefinition: true },
      });
      if (!loadPackage) throw new NotFoundException('Load package not found');

      // 4. Load vehicle
      const vehicle = await tx.vehicle.findUnique({ where: { id: load.vehicleId } });
      if (!vehicle) throw new NotFoundException('Vehicle not found');

      // 5. Validate rotation is allowed
      const pkg = loadPackage.packageDefinition;
      if (!pkg.allowedRotations.includes(dto.rotationIndex)) {
        throw new BadRequestException({
          code: ErrorCode.INVALID_ROTATION,
          message: `Rotation ${dto.rotationIndex} is not allowed for this package.`,
        });
      }

      // 6. Build candidate item
      const candidateDims: Dimensions3D = { length: pkg.length, width: pkg.width, height: pkg.height };
      const candidateItem = buildPlacedItem(
        dto.loadPackageId,
        { x: dto.x, y: dto.y, z: dto.z },
        candidateDims,
        dto.rotationIndex as RotationIndex,
      );

      // 7. Containment check
      const trailerSpace = buildTrailerSpace(vehicle.interiorLength, vehicle.interiorWidth, vehicle.interiorHeight);
      if (!checkContainment(candidateItem, trailerSpace)) {
        throw new BadRequestException({
          code: ErrorCode.PACKAGE_OUTSIDE_TRAILER,
          message: 'Package placement extends outside trailer boundaries.',
        });
      }

      // 8. Load all OTHER placements for collision check
      const existingPlacements = await tx.placement.findMany({
        where: { loadId, loadPackageId: { not: dto.loadPackageId } },
        include: { loadPackage: { include: { packageDefinition: true } } },
      });

      const placedItems = existingPlacements.map((ep) => {
        const epPkg = ep.loadPackage.packageDefinition;
        return buildPlacedItem(
          ep.loadPackageId,
          { x: ep.x, y: ep.y, z: ep.z },
          { length: epPkg.length, width: epPkg.width, height: epPkg.height },
          ep.rotationIndex as RotationIndex,
        );
      });

      // 9. Collision check
      const collision = checkCollisions(candidateItem, placedItems);
      if (collision.hasCollision) {
        throw new ConflictException({
          code: ErrorCode.PACKAGE_COLLISION,
          message: `Package overlaps with ${collision.conflictingIds.length} existing package(s).`,
          details: { conflictingIds: collision.conflictingIds },
        });
      }

      // 10. Upsert placement
      const placement = await tx.placement.upsert({
        where: { loadPackageId: dto.loadPackageId },
        create: {
          loadId,
          loadPackageId: dto.loadPackageId,
          x: dto.x, y: dto.y, z: dto.z,
          rotationIndex: dto.rotationIndex,
          createdById: user.sub,
          updatedById: user.sub,
        },
        update: {
          x: dto.x, y: dto.y, z: dto.z,
          rotationIndex: dto.rotationIndex,
          updatedById: user.sub,
        },
      });

      // 11. Update package status + increment load version
      await tx.loadPackage.update({ where: { id: dto.loadPackageId }, data: { status: 'PLACED' } });
      const updatedLoad = await tx.load.update({ where: { id: loadId }, data: { version: { increment: 1 } } });

      // 12. Create audit log
      await tx.auditLog.create({
        data: {
          organizationId: user.orgId,
          loadId,
          userId: user.sub,
          action: 'PACKAGE_PLACED',
          entityType: 'Placement',
          entityId: placement.id,
          newState: {
            x: dto.x,
            y: dto.y,
            z: dto.z,
            rotationIndex: dto.rotationIndex,
            loadPackageId: dto.loadPackageId,
          },
        },
      });

      return { placement, newVersion: updatedLoad.version };
    });

    // Broadcast to real-time room
    this.loadGateway.broadcastToLoad(loadId, WS_EVENTS.PLACEMENT_UPDATED, result.placement);
    this.loadGateway.broadcastToLoad(loadId, WS_EVENTS.LOAD_UPDATED, { loadId, version: result.newVersion });

    return result.placement;
  }

  async removePlacement(loadId: string, placementId: string, loadVersion: number, user: JwtPayload) {
    const result = await this.prisma.$transaction(async (tx) => {
      const loads = await tx.$queryRaw<Array<{ id: string; version: number }>>`
        SELECT id, version FROM "Load"
        WHERE id = ${loadId} AND "organizationId" = ${user.orgId}
        FOR UPDATE
      `;
      const load = loads[0];
      if (!load) throw new NotFoundException('Load not found');

      if (load.version !== loadVersion) {
        throw new ConflictException({
          code: ErrorCode.STALE_LOAD_VERSION,
          message: 'Load version mismatch.',
          currentVersion: load.version,
        });
      }

      const placement = await tx.placement.findFirst({ where: { id: placementId, loadId } });
      if (!placement) throw new NotFoundException('Placement not found');

      await tx.placement.delete({ where: { id: placementId } });
      await tx.loadPackage.update({ where: { id: placement.loadPackageId }, data: { status: 'PENDING' } });
      const updatedLoad = await tx.load.update({ where: { id: loadId }, data: { version: { increment: 1 } } });

      await tx.auditLog.create({
        data: {
          organizationId: user.orgId,
          loadId,
          userId: user.sub,
          action: 'PACKAGE_REMOVED',
          entityType: 'Placement',
          entityId: placementId,
          previousState: { placementId, loadPackageId: placement.loadPackageId },
        },
      });

      return { newVersion: updatedLoad.version };
    });

    this.loadGateway.broadcastToLoad(loadId, WS_EVENTS.PLACEMENT_REMOVED, { placementId });
    this.loadGateway.broadcastToLoad(loadId, WS_EVENTS.LOAD_UPDATED, { loadId, version: result.newVersion });
  }
}


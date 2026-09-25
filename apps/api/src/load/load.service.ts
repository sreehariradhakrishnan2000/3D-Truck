import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoadGateway } from '../websocket/load.gateway';
import { runPackingEngine } from '@cargoflow/packing-engine';
import type { CreateLoadDto, UpdateLoadDto } from '@cargoflow/validation';
import type { JwtPayload, RotationIndex, PackingPackage } from '@cargoflow/shared-types';
import { LoadStatus, ErrorCode, WS_EVENTS } from '@cargoflow/shared-types';

@Injectable()
export class LoadService {
  constructor(
    private prisma: PrismaService,
    private loadGateway: LoadGateway,
  ) {}

  async findAll(user: JwtPayload, status?: LoadStatus) {
    return this.prisma.load.findMany({
      where: { organizationId: user.orgId, ...(status && { status }) },
      include: {
        vehicle: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { loadPackages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: JwtPayload) {
    const load = await this.prisma.load.findFirst({
      where: { id, organizationId: user.orgId },
      include: {
        vehicle: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        loadPackages: {
          include: { packageDefinition: true, placements: true },
          orderBy: { createdAt: 'asc' },
        },
        placements: true,
        loadingSequence: {
          include: { loadPackage: { include: { packageDefinition: true } } },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });
    if (!load) throw new NotFoundException('Load not found');
    return load;
  }

  async create(dto: CreateLoadDto, user: JwtPayload) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, organizationId: user.orgId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const count = await this.prisma.load.count({ where: { organizationId: user.orgId } });
    const loadNumber = `LOAD-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.load.create({
      data: {
        ...dto,
        loadNumber,
        organizationId: user.orgId,
        createdById: user.sub,
        status: LoadStatus.DRAFT,
      } as any,
      include: { vehicle: true },
    });
  }

  async update(id: string, dto: UpdateLoadDto, user: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const load = await tx.load.findFirst({ where: { id, organizationId: user.orgId } });
      if (!load) throw new NotFoundException('Load not found');

      if (load.version !== dto.version) {
        throw new ConflictException({
          code: ErrorCode.STALE_LOAD_VERSION,
          message: 'The load was modified by someone else. Please refresh.',
          currentVersion: load.version,
        });
      }

      const { version: _v, ...updateData } = dto;
      return tx.load.update({
        where: { id },
        data: { ...updateData, version: { increment: 1 } },
        include: { vehicle: true },
      });
    });
  }

  async remove(id: string, user: JwtPayload) {
    const load = await this.prisma.load.findFirst({ where: { id, organizationId: user.orgId } });
    if (!load) throw new NotFoundException('Load not found');
    return this.prisma.load.delete({ where: { id } });
  }

  async recalculateTotals(loadId: string) {
    const load = await this.prisma.load.findUnique({
      where: { id: loadId },
      include: {
        vehicle: true,
        loadPackages: { include: { packageDefinition: true } },
      },
    });
    if (!load) return;

    const totalWeightKg = load.loadPackages.reduce(
      (sum, lp) => sum + lp.packageDefinition.weightKg * lp.quantity,
      0,
    );
    const totalVolumeMm3 = load.loadPackages.reduce(
      (sum, lp) =>
        sum +
        lp.packageDefinition.length *
          lp.packageDefinition.width *
          lp.packageDefinition.height *
          lp.quantity,
      0,
    );
    const trailerVolume =
      load.vehicle.interiorLength * load.vehicle.interiorWidth * load.vehicle.interiorHeight;
    const packageCount = load.loadPackages.reduce((s, lp) => s + lp.quantity, 0);

    await this.prisma.load.update({
      where: { id: loadId },
      data: {
        totalWeightKg,
        totalVolumeMm3,
        packageCount,
        weightUtilizationPct:
          load.vehicle.maxPayloadKg > 0 ? (totalWeightKg / load.vehicle.maxPayloadKg) * 100 : 0,
        volumeUtilizationPct: trailerVolume > 0 ? (totalVolumeMm3 / trailerVolume) * 100 : 0,
      },
    });
  }

  async autoPack(loadId: string, user: JwtPayload, strategy: 'GREEDY' | 'BFD' = 'GREEDY') {
    const load = await this.findOne(loadId, user);

    this.loadGateway.broadcastToLoad(loadId, WS_EVENTS.PACKING_STARTED, { loadId });

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

    this.loadGateway.broadcastToLoad(loadId, WS_EVENTS.PACKING_PROGRESS, {
      loadId,
      progress: 50,
      message: 'Arranging 3D packages...',
    });

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

    // Loading Sequence: Deepest along length (lowest X) and lowest height (Z) first
    const sortedForLoading = [...result.placements].sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      if (a.z !== b.z) return a.z - b.z;
      return a.y - b.y;
    });

    const placementData = result.placements.map((p) => ({
      loadId,
      loadPackageId: p.loadPackageId,
      x: p.x,
      y: p.y,
      z: p.z,
      rotationIndex: p.rotationIndex,
      createdById: user.sub,
      updatedById: user.sub,
    }));

    const sequenceData = sortedForLoading.map((p, i) => ({
      loadId,
      loadPackageId: p.loadPackageId,
      sequenceOrder: i + 1,
      notes: `Step ${i + 1}: Place at (${Math.round(p.x)}mm, ${Math.round(p.y)}mm, ${Math.round(p.z)}mm)`,
    }));

    const placedIds = result.placements.map((p) => p.loadPackageId);
    const unplacedIds = result.unplaced.map((u) => u.loadPackageId);

    await this.prisma.$transaction(
      async (tx) => {
        await tx.loadingSequenceItem.deleteMany({ where: { loadId } });
        await tx.placement.deleteMany({ where: { loadId } });

        if (placementData.length > 0) {
          await tx.placement.createMany({ data: placementData });
          await tx.loadPackage.updateMany({
            where: { id: { in: placedIds } },
            data: { status: 'PLACED' },
          });
        }

        if (unplacedIds.length > 0) {
          await tx.loadPackage.updateMany({
            where: { id: { in: unplacedIds } },
            data: { status: 'UNPLACEABLE' },
          });
        }

        if (sequenceData.length > 0) {
          await tx.loadingSequenceItem.createMany({ data: sequenceData });
        }

        await tx.load.update({
          where: { id: loadId },
          data: {
            version: { increment: 1 },
            volumeUtilizationPct: result.volumeUtilizationPct,
            weightUtilizationPct: result.weightUtilizationPct,
            validationPassed: result.success,
          },
        });

        // Record Audit Log
        await tx.auditLog.create({
          data: {
            organizationId: user.orgId,
            loadId,
            userId: user.sub,
            action: 'AUTO_PACK_COMPLETED',
            entityType: 'Load',
            entityId: loadId,
            newState: {
              placedCount: result.placements.length,
              unplacedCount: result.unplaced.length,
              volumeUtilizationPct: result.volumeUtilizationPct,
              weightUtilizationPct: result.weightUtilizationPct,
            },
          },
        });
      },
      { timeout: 30000, maxWait: 10000 }
    );

    this.loadGateway.broadcastToLoad(loadId, WS_EVENTS.PACKING_COMPLETED, result);

    return this.findOne(loadId, user);
  }

  async getLoadingSequence(loadId: string, user: JwtPayload) {
    const load = await this.prisma.load.findFirst({
      where: { id: loadId, organizationId: user.orgId },
    });
    if (!load) throw new NotFoundException('Load not found');

    return this.prisma.loadingSequenceItem.findMany({
      where: { loadId },
      include: {
        loadPackage: {
          include: {
            packageDefinition: true,
            placements: true,
          },
        },
      },
      orderBy: { sequenceOrder: 'asc' },
    });
  }

  async getAuditLogs(loadId: string, user: JwtPayload) {
    const load = await this.prisma.load.findFirst({
      where: { id: loadId, organizationId: user.orgId },
    });
    if (!load) throw new NotFoundException('Load not found');

    return this.prisma.auditLog.findMany({
      where: { loadId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

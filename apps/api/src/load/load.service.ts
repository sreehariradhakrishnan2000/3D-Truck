import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateLoadDto, UpdateLoadDto } from '@cargoflow/validation';
import type { JwtPayload } from '@cargoflow/shared-types';
import { LoadStatus, ErrorCode } from '@cargoflow/shared-types';

@Injectable()
export class LoadService {
  constructor(private prisma: PrismaService) {}

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
      },
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
}


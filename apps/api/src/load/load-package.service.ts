import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AddLoadPackageDto } from '@cargoflow/validation';
import type { JwtPayload } from '@cargoflow/shared-types';
import { LoadService } from './load.service';

@Injectable()
export class LoadPackageService {
  constructor(private prisma: PrismaService, private loadService: LoadService) {}

  async getPackages(loadId: string, user: JwtPayload) {
    const load = await this.prisma.load.findFirst({ where: { id: loadId, organizationId: user.orgId } });
    if (!load) throw new NotFoundException('Load not found');
    return this.prisma.loadPackage.findMany({
      where: { loadId },
      include: { packageDefinition: true, placements: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addPackage(loadId: string, dto: AddLoadPackageDto, user: JwtPayload) {
    const load = await this.prisma.load.findFirst({ where: { id: loadId, organizationId: user.orgId } });
    if (!load) throw new NotFoundException('Load not found');

    const pkgDef = await this.prisma.packageDefinition.findFirst({
      where: { id: dto.packageDefinitionId, organizationId: user.orgId },
    });
    if (!pkgDef) throw new NotFoundException('Package definition not found');

    const loadPackage = await this.prisma.loadPackage.create({
      data: {
        loadId,
        packageDefinitionId: dto.packageDefinitionId,
        quantity: dto.quantity ?? 1,
        stopSequence: dto.stopSequence,
        priority: dto.priority ?? 5,
        notes: dto.notes,
      },
      include: { packageDefinition: true },
    });

    await this.loadService.recalculateTotals(loadId);
    return loadPackage;
  }

  async removePackage(loadId: string, loadPackageId: string, user: JwtPayload) {
    const load = await this.prisma.load.findFirst({ where: { id: loadId, organizationId: user.orgId } });
    if (!load) throw new NotFoundException('Load not found');
    const lp = await this.prisma.loadPackage.findFirst({ where: { id: loadPackageId, loadId } });
    if (!lp) throw new NotFoundException('Load package not found');
    await this.prisma.loadPackage.delete({ where: { id: loadPackageId } });
    await this.loadService.recalculateTotals(loadId);
  }
}


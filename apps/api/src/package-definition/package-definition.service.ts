import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePackageDefinitionDto, UpdatePackageDefinitionDto } from '@cargoflow/validation';
import type { JwtPayload } from '@cargoflow/shared-types';

@Injectable()
export class PackageDefinitionService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: JwtPayload, search?: string) {
    return this.prisma.packageDefinition.findMany({
      where: {
        organizationId: user.orgId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { packageNumber: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: JwtPayload) {
    const pkg = await this.prisma.packageDefinition.findFirst({
      where: { id, organizationId: user.orgId },
    });
    if (!pkg) throw new NotFoundException('Package definition not found');
    return pkg;
  }

  async create(dto: CreatePackageDefinitionDto, user: JwtPayload) {
    const count = await this.prisma.packageDefinition.count({ where: { organizationId: user.orgId } });
    const packageNumber = `PKG-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.packageDefinition.create({
      data: { ...dto, organizationId: user.orgId, packageNumber } as any,
    });
  }

  async update(id: string, dto: UpdatePackageDefinitionDto, user: JwtPayload) {
    await this.findOne(id, user);
    return this.prisma.packageDefinition.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: JwtPayload) {
    await this.findOne(id, user);
    return this.prisma.packageDefinition.delete({ where: { id } });
  }
}


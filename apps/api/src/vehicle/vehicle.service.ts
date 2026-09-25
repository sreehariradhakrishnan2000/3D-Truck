import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateVehicleDto, UpdateVehicleDto } from '@cargoflow/validation';
import type { JwtPayload } from '@cargoflow/shared-types';

@Injectable()
export class VehicleService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: JwtPayload) {
    return this.prisma.vehicle.findMany({
      where: { organizationId: user.orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: JwtPayload) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, organizationId: user.orgId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async create(dto: CreateVehicleDto, user: JwtPayload) {
    return this.prisma.vehicle.create({
      data: { ...dto, organizationId: user.orgId },
    });
  }

  async update(id: string, dto: UpdateVehicleDto, user: JwtPayload) {
    await this.findOne(id, user);
    return this.prisma.vehicle.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: JwtPayload) {
    await this.findOne(id, user);
    return this.prisma.vehicle.delete({ where: { id } });
  }
}


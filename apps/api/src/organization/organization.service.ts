import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '@cargoflow/shared-types';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async getMyOrganization(user: JwtPayload) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.orgId },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }
}


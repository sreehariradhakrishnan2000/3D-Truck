import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '@cargoflow/shared-types';
import { UserRole } from '@cargoflow/shared-types';
import * as argon2 from 'argon2';

export interface InviteMemberDto {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

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

  async getMembers(user: JwtPayload) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: user.orgId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async inviteMember(dto: InviteMemberDto, currentUser: JwtPayload) {
    let targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!targetUser) {
      const defaultPasswordHash = await argon2.hash('Welcome123!');
      targetUser = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash: defaultPasswordHash,
        },
      });
    }

    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: currentUser.orgId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this organization');
    }

    return this.prisma.organizationMember.create({
      data: {
        organizationId: currentUser.orgId,
        userId: targetUser.id,
        role: dto.role,
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateMemberRole(memberId: string, role: UserRole, currentUser: JwtPayload) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: currentUser.orgId },
    });
    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  async removeMember(memberId: string, currentUser: JwtPayload) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: currentUser.orgId },
    });
    if (!member) throw new NotFoundException('Member not found');

    if (member.userId === currentUser.sub) {
      throw new BadRequestException('You cannot remove yourself from the organization');
    }

    return this.prisma.organizationMember.delete({
      where: { id: memberId },
    });
  }
}


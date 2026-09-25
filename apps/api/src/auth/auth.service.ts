import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterDto, LoginDto } from '@cargoflow/validation';
import { JwtPayload, UserRole } from '@cargoflow/shared-types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(dto.password);

    const result = await this.prisma.$transaction(async (tx) => {
      const slug =
        dto.organizationName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 45) +
        '-' +
        uuidv4().slice(0, 8);

      const org = await tx.organization.create({
        data: { name: dto.organizationName, slug },
      });

      const user = await tx.user.create({
        data: { email: dto.email, passwordHash, firstName: dto.firstName, lastName: dto.lastName },
      });

      await tx.organizationMember.create({
        data: { organizationId: org.id, userId: user.id, role: 'ORG_ADMIN' },
      });

      return { user, org };
    });

    return this.generateTokens(result.user.id, result.user.email, UserRole.ORG_ADMIN, result.org.id);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { memberships: { include: { organization: true } } },
    });

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) throw new UnauthorizedException('Account is inactive');

    const membership = user.memberships[0];
    if (!membership) throw new BadRequestException('User has no organization');

    return this.generateTokens(user.id, user.email, membership.role as UserRole, membership.organizationId);
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('No refresh token provided');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { memberships: true } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const membership = stored.user.memberships[0];
    return this.generateTokens(
      stored.user.id,
      stored.user.email,
      membership?.role as UserRole,
      membership?.organizationId,
    );
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async validateJwtPayload(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) return null;
    return payload;
  }

  private async generateTokens(userId: string, email: string, role: UserRole, orgId: string) {
    const payload: JwtPayload = { sub: userId, email, role, orgId };
    const accessToken = this.jwt.sign(payload);

    const refreshTokenValue = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: { userId, token: refreshTokenValue, expiresAt },
    });

    return { accessToken, refreshToken: refreshTokenValue, expiresIn: 900 };
  }
}


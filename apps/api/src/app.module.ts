import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationModule } from './organization/organization.module';
import { UserModule } from './user/user.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { LoadModule } from './load/load.module';
import { PackageDefinitionModule } from './package-definition/package-definition.module';
import { PlacementModule } from './placement/placement.module';
import { LoadValidationModule } from './load-validation/load-validation.module';
import { HealthModule } from './health/health.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    PrismaModule,
    AuthModule,
    OrganizationModule,
    UserModule,
    VehicleModule,
    LoadModule,
    PackageDefinitionModule,
    PlacementModule,
    LoadValidationModule,
    HealthModule,
    WebsocketModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}


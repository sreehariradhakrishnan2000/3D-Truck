import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VehicleService } from './vehicle.service';
import { CreateVehicleSchema, UpdateVehicleSchema } from '@cargoflow/validation';
import { UserRole } from '@cargoflow/shared-types';
import type { JwtPayload } from '@cargoflow/shared-types';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.vehicleService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.vehicleService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.PLANNER, UserRole.ORG_ADMIN)
  create(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = CreateVehicleSchema.parse(body);
    return this.vehicleService.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLANNER, UserRole.ORG_ADMIN)
  update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = UpdateVehicleSchema.parse(body);
    return this.vehicleService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ORG_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.vehicleService.remove(id, user);
  }
}


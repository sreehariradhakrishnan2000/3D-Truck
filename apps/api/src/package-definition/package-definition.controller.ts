import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PackageDefinitionService } from './package-definition.service';
import { CreatePackageDefinitionSchema, UpdatePackageDefinitionSchema } from '@cargoflow/validation';
import type { JwtPayload } from '@cargoflow/shared-types';

@Controller('package-definitions')
@UseGuards(JwtAuthGuard)
export class PackageDefinitionController {
  constructor(private readonly service: PackageDefinitionService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('search') search?: string) {
    return this.service.findAll(user, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = CreatePackageDefinitionSchema.parse(body);
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = UpdatePackageDefinitionSchema.parse(body);
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}


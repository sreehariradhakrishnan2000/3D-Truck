import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoadService } from './load.service';
import { LoadPackageService } from './load-package.service';
import { CreateLoadSchema, UpdateLoadSchema, AddLoadPackageSchema } from '@cargoflow/validation';
import { LoadStatus } from '@cargoflow/shared-types';
import type { JwtPayload } from '@cargoflow/shared-types';

@Controller('loads')
@UseGuards(JwtAuthGuard)
export class LoadController {
  constructor(
    private readonly loadService: LoadService,
    private readonly loadPackageService: LoadPackageService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('status') status?: LoadStatus) {
    return this.loadService.findAll(user, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.loadService.findOne(id, user);
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = CreateLoadSchema.parse(body);
    return this.loadService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = UpdateLoadSchema.parse(body);
    return this.loadService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.loadService.remove(id, user);
  }

  @Get(':id/packages')
  getPackages(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.loadPackageService.getPackages(id, user);
  }

  @Post(':id/packages')
  addPackage(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = AddLoadPackageSchema.parse(body);
    return this.loadPackageService.addPackage(id, dto, user);
  }

  @Delete(':id/packages/:packageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePackage(
    @Param('id') id: string,
    @Param('packageId') packageId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.loadPackageService.removePackage(id, packageId, user);
  }
}


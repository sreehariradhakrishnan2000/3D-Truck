import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PlacementService } from './placement.service';
import { CreatePlacementSchema } from '@cargoflow/validation';
import type { JwtPayload } from '@cargoflow/shared-types';

@Controller('loads/:loadId/placements')
@UseGuards(JwtAuthGuard)
export class PlacementController {
  constructor(private readonly placementService: PlacementService) {}

  @Get()
  getPlacements(@Param('loadId') loadId: string, @CurrentUser() user: JwtPayload) {
    return this.placementService.getPlacements(loadId, user);
  }

  @Post()
  createPlacement(
    @Param('loadId') loadId: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = CreatePlacementSchema.parse(body);
    return this.placementService.createOrUpdatePlacement(loadId, dto, user);
  }

  @Delete(':placementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePlacement(
    @Param('loadId') loadId: string,
    @Param('placementId') placementId: string,
    @Query('loadVersion') loadVersion: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.placementService.removePlacement(loadId, placementId, parseInt(loadVersion, 10), user);
  }
}


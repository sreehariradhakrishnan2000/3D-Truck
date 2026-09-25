import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoadValidationService } from './load-validation.service';
import type { JwtPayload } from '@cargoflow/shared-types';

@Controller('loads/:loadId/validation')
@UseGuards(JwtAuthGuard)
export class LoadValidationController {
  constructor(private readonly validationService: LoadValidationService) {}

  @Get()
  validate(@Param('loadId') loadId: string, @CurrentUser() user: JwtPayload) {
    return this.validationService.validateLoad(loadId, user);
  }
}


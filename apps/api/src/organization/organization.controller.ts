import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationService } from './organization.service';
import type { JwtPayload } from '@cargoflow/shared-types';

@Controller('organization')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get('me')
  getMyOrg(@CurrentUser() user: JwtPayload) {
    return this.orgService.getMyOrganization(user);
  }
}


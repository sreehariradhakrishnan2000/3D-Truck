import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationService, InviteMemberDto } from './organization.service';
import type { JwtPayload } from '@cargoflow/shared-types';
import { UserRole } from '@cargoflow/shared-types';

@Controller('organization')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get('me')
  getMyOrg(@CurrentUser() user: JwtPayload) {
    return this.orgService.getMyOrganization(user);
  }

  @Get('members')
  getMembers(@CurrentUser() user: JwtPayload) {
    return this.orgService.getMembers(user);
  }

  @Post('members/invite')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  inviteMember(@Body() dto: InviteMemberDto, @CurrentUser() user: JwtPayload) {
    return this.orgService.inviteMember(dto, user);
  }

  @Patch('members/:id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  updateMemberRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orgService.updateMemberRole(id, role, user);
  }

  @Delete('members/:id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  removeMember(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.orgService.removeMember(id, user);
  }
}


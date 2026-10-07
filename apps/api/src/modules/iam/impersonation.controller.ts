import { Controller, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ImpersonationService } from './impersonation.service';

@ApiTags('Impersonation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/impersonation')
export class ImpersonationController {
  constructor(private readonly impersonationService: ImpersonationService) {}

  @Post()
  @ApiOperation({ summary: 'Impersonate an account lower in the hierarchy' })
  async impersonate(@Request() req, @Body('targetAccountId') targetAccountId: number) {
    if (!targetAccountId) {
      throw new ForbiddenException('targetAccountId is required');
    }
    return this.impersonationService.impersonate(req.user, targetAccountId);
  }
}

import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../iam/jwt-auth.guard';
import { WebhooksService, CreateWebhookDto } from './webhooks.service';

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @ApiOperation({ summary: 'List webhook endpoints' })
  async listEndpoints(@Request() req) {
    return this.webhooksService.listEndpoints(req.user.accountPath);
  }

  @Post()
  @ApiOperation({ summary: 'Create webhook endpoint' })
  async createEndpoint(@Request() req, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.createEndpoint(req.user.accountId, req.user.accountPath, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  async deleteEndpoint(@Request() req, @Param('id') id: string) {
    return this.webhooksService.deleteEndpoint(req.user.accountPath, parseInt(id, 10));
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test a webhook endpoint' })
  async testEndpoint(@Request() req, @Param('id') id: string) {
    return this.webhooksService.dispatchEvent(
      req.user.accountId,
      req.user.accountPath,
      'test.event',
      { message: 'This is a test event from RateDeck.', timestamp: new Date().toISOString() }
    );
  }
}

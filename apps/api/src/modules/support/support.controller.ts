import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../iam/jwt-auth.guard';
import { SupportService, CreateTicketDto, CreateMessageDto } from './support.service';

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List tickets' })
  async listTickets(@Request() req, @Query('limit') limit = 50) {
    return this.supportService.listTickets(req.user.accountPath, Number(limit));
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Create a new support ticket' })
  async createTicket(@Request() req, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(req.user.accountId, req.user.accountPath, req.user.userId, dto);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket details and messages' })
  async getTicket(@Request() req, @Param('id') publicId: string) {
    return this.supportService.getTicket(req.user.accountPath, publicId);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Add a message to a ticket' })
  async addMessage(@Request() req, @Param('id') publicId: string, @Body() dto: CreateMessageDto) {
    return this.supportService.addMessage(req.user.accountPath, publicId, req.user.userId, dto);
  }
}

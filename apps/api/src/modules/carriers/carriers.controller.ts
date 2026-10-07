import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../iam/jwt-auth.guard';
import { CarriersService, CreateCarrierDto, CreateTrunkDto } from './carriers.service';

@ApiTags('Carriers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/carriers')
export class CarriersController {
  constructor(private readonly carriersService: CarriersService) {}

  @Get()
  @ApiOperation({ summary: 'List all carriers for the current tenant' })
  async listCarriers(@Request() req) {
    return this.carriersService.listCarriers(req.user.accountPath);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new carrier' })
  async createCarrier(@Request() req, @Body() dto: CreateCarrierDto) {
    return this.carriersService.createCarrier(req.user.accountId, req.user.accountPath, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific carrier' })
  async getCarrier(@Request() req, @Param('id') publicId: string) {
    return this.carriersService.getCarrier(req.user.accountPath, publicId);
  }

  @Get('trunks')
  @ApiOperation({ summary: 'List trunks' })
  async listTrunks(@Request() req, @Query('carrierId') carrierId?: number) {
    return this.carriersService.listTrunks(req.user.accountPath, carrierId ? Number(carrierId) : undefined);
  }

  @Post('trunks')
  @ApiOperation({ summary: 'Create a trunk' })
  async createTrunk(@Request() req, @Body() dto: CreateTrunkDto) {
    return this.carriersService.createTrunk(req.user.accountId, req.user.accountPath, dto);
  }
}

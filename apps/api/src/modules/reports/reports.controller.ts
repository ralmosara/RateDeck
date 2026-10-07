import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../iam/jwt-auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('usage')
  @ApiOperation({ summary: 'Get total usage for a given period' })
  @ApiQuery({ name: 'startDate', type: Date, required: true })
  @ApiQuery({ name: 'endDate', type: Date, required: true })
  async getUsageReport(@Request() req, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.reportsService.getUsageReport(req.user.accountPath, new Date(startDate), new Date(endDate));
  }

  @Get('destinations')
  @ApiOperation({ summary: 'Get usage grouped by destination' })
  @ApiQuery({ name: 'startDate', type: Date, required: true })
  @ApiQuery({ name: 'endDate', type: Date, required: true })
  async getDestinationReport(@Request() req, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.reportsService.getDestinationReport(req.user.accountPath, new Date(startDate), new Date(endDate));
  }
}

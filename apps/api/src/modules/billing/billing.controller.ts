import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../iam/jwt-auth.guard';
import { BillingService } from './billing.service';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current ledger balance for the tenant' })
  async getBalance(@Request() req) {
    const balance = await this.billingService.getLedgerBalance(req.user.accountPath);
    return { balance: Number(balance) };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List ledger transactions' })
  async listTransactions(@Request() req, @Query('limit') limit = 50) {
    return this.billingService.listTransactions(req.user.accountPath, Number(limit));
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices' })
  async listInvoices(@Request() req, @Query('limit') limit = 50) {
    return this.billingService.listInvoices(req.user.accountPath, Number(limit));
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Simulate adding funds via credit card (Stripe integration stub)' })
  async addFunds(@Request() req, @Body('amount') amount: string, @Body('paymentMethodId') paymentMethodId?: string) {
    // In a real flow, we'd call Stripe to charge `paymentMethodId`
    // const charge = await stripe.charges.create({ amount: Number(amount) * 100, ... })
    // On success:
    return this.billingService.addFunds(req.user.accountId, req.user.accountPath, amount, 'sim_ch_12345');
  }
}

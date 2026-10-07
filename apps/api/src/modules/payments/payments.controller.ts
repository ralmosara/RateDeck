import { Controller, Post, Headers, Req, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Request } from 'express';

@ApiTags('payments')
@Controller('v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook receiver' })
  async handleWebhook(@Headers('stripe-signature') signature: string, @Body() body: any) {
    // In production we would verify the Stripe signature here using the raw body
    if (!signature && process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Missing stripe signature');
    }

    try {
      await this.paymentsService.processStripeWebhook(signature, body);
      return { received: true };
    } catch (err: any) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }
}

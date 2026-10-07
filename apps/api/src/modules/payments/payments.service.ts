import { Injectable, Logger } from '@nestjs/common';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly billingService: BillingService) {}

  async processStripeWebhook(signature: string, payload: any) {
    this.logger.log(`Received Stripe Webhook: ${payload.type}`);

    if (payload.type === 'payment_intent.succeeded') {
      const intent = payload.data.object;
      
      // Look up the tenant's accountId and path from intent.metadata
      const accountId = Number(intent.metadata?.accountId || 1);
      const accountPath = intent.metadata?.accountPath || 'root.1';
      const amount = (intent.amount / 100).toString(); // Convert cents to dollars

      // Process the deposit using our rigorous double-entry billing service
      await this.billingService.addFunds(accountId, accountPath, amount, intent.id);
      this.logger.log(`Successfully credited $${amount} to account ${accountPath}`);
    }
  }
}

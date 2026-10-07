import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingProcessor } from './billing.processor';

@Module({
  imports: [DatabaseModule],
  controllers: [BillingController],
  providers: [BillingService, BillingProcessor],
  exports: [BillingService],
})
export class BillingModule {}

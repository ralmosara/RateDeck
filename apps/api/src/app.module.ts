import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ObservabilityModule } from './common/observability.module';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { PlatformModule } from './modules/platform/platform.module';
import { IamModule } from './modules/iam/iam.module';
import { RatesModule } from './modules/rates/rates.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { AuditModule } from './modules/audit/audit.module';
import { CarriersModule } from './modules/carriers/carriers.module';
import { NumbersModule } from './modules/numbers/numbers.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CdrModule } from './modules/cdr/cdr.module';
import { RatingModule } from './modules/rating/rating.module';
import { BillingModule } from './modules/billing/billing.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SupportModule } from './modules/support/support.module';

/**
 * Composition root for the HTTP process.
 * Bounded-context modules are added per roadmap phase:
 *   Phase 1: IamModule, AccountsModule, AuditModule
 *   Phase 2: CarriersModule, RatesModule
 *   Phase 3: CdrModule, RatingModule, ReportsModule ...
 */
@Module({
  imports: [ConfigModule, ObservabilityModule, DatabaseModule, RedisModule, PlatformModule, IamModule, RatesModule, AccountsModule, AuditModule, CarriersModule, NumbersModule, CatalogModule, CdrModule, RatingModule, BillingModule, LedgerModule, PaymentsModule, WebhooksModule, ReportsModule, NotificationsModule, SupportModule],
  providers: [{ provide: APP_FILTER, useClass: ProblemDetailsFilter }],
})
export class AppModule {}

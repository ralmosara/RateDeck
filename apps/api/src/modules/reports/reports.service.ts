import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { usageDailySummary } from '../../infrastructure/database/schema/cdrs';
import { eq, and, gte, lte } from 'drizzle-orm';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async getUsageReport(accountPath: string, startDate: Date, endDate: Date) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      const { sql } = await import('drizzle-orm');

      // Aggregate usage daily summary into a total over the period
      const result = await tx.execute(sql`
        SELECT 
          COALESCE(SUM(total_calls), 0) as total_calls,
          COALESCE(SUM(total_duration_sec), 0) as total_duration_sec,
          COALESCE(SUM(total_billed_sec), 0) as total_billed_sec,
          COALESCE(SUM(total_cost_amount), 0) as total_cost,
          COALESCE(SUM(total_sell_amount), 0) as total_sell
        FROM ${usageDailySummary}
        WHERE account_path = ${accountPath}
          AND day >= ${startDate}
          AND day <= ${endDate}
      `);

      return result.rows[0];
    });
  }

  async getDestinationReport(accountPath: string, startDate: Date, endDate: Date) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      const { sql } = await import('drizzle-orm');

      // Aggregate usage grouped by destination
      const result = await tx.execute(sql`
        SELECT 
          destination,
          COALESCE(SUM(total_calls), 0) as total_calls,
          COALESCE(SUM(total_billed_sec), 0) as total_billed_sec,
          COALESCE(SUM(total_sell_amount), 0) as total_sell
        FROM ${usageDailySummary}
        WHERE account_path = ${accountPath}
          AND day >= ${startDate}
          AND day <= ${endDate}
        GROUP BY destination
        ORDER BY total_sell DESC
        LIMIT 50
      `);

      return result.rows;
    });
  }
}

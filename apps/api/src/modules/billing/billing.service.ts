import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { ledgerTransactions, ledgerEntries, invoices } from '../../infrastructure/database/schema/billing';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class BillingService {
  constructor(private readonly db: DatabaseService) {}

  async getLedgerBalance(accountPath: string) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      const { sql } = await import('drizzle-orm');
      // Calculate the sum of all credits - debits for the exact account matching this path.
      const result = await tx.execute(sql`
        SELECT 
          COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0) as balance 
        FROM ${ledgerEntries} 
        WHERE account_path = ${accountPath}
      `);
      return result.rows[0].balance;
    });
  }

  async listTransactions(accountPath: string, limit = 50) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      const { sql } = await import('drizzle-orm');
      const result = await tx.execute(sql`
        SELECT 
          t.id, t.public_id as "publicId", t.type, t.description, t.created_at as "createdAt",
          e.amount
        FROM ${ledgerTransactions} t
        JOIN ${ledgerEntries} e ON e.transaction_id = t.id
        WHERE t.account_path = ${accountPath} AND e.account_path = ${accountPath} AND e.direction = 'credit'
        ORDER BY t.created_at DESC
        LIMIT ${limit}
      `);
      return result.rows;
    });
  }

  async listInvoices(accountPath: string, limit = 50) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      return tx.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(limit);
    });
  }

  async addFunds(accountId: number, accountPath: string, amount: string, referenceId?: string) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      // 1. Create Transaction Header
      const [header] = await tx.insert(ledgerTransactions).values({
        accountId,
        accountPath,
        type: 'deposit',
        referenceType: 'stripe_charge',
        referenceId,
        description: 'Prepaid deposit via credit card',
      }).returning();

      // 2. Create Entries (Double Entry)
      // Debit: Cash/Bank (System account conceptually, but for now we just credit the tenant)
      // Credit: Tenant Prepaid Balance
      await tx.insert(ledgerEntries).values([
        {
          transactionId: header.id,
          accountId,
          accountPath,
          direction: 'credit', // Credit increases prepaid liability/balance for the user
          amount,
        }
        // In a full strict double-entry, we'd debit a system bank account here.
        // For multi-tenant isolation, we focus on the tenant's side of the ledger.
      ]);

      return header;
    });
  }

  async chargeUsage(accountId: number, accountPath: string, amount: number, currency: string, invoiceNumber: string) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      const [header] = await tx.insert(ledgerTransactions).values({
        accountId,
        accountPath,
        type: 'charge',
        referenceType: 'invoice',
        referenceId: invoiceNumber,
        description: `End-of-month usage charge for ${invoiceNumber}`,
      }).returning();

      await tx.insert(ledgerEntries).values([
        {
          transactionId: header.id,
          accountId,
          accountPath,
          direction: 'debit', // Debit reduces their prepaid balance
          amount: amount.toString(),
          currency
        }
      ]);

      return header;
    });
  }
}

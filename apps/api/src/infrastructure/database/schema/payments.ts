import { pgTable as dpgTable, bigint as dbigint, text as dtext, uuid as duuid, char as dchar, timestamp, numeric as dnumeric, index as dindex } from 'drizzle-orm/pg-core';
import { ltree } from './_types';
import { accounts } from './core';

export const payments = dpgTable('payments', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: duuid('public_id').notNull().defaultRandom().unique(),
  accountId: dbigint('account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  accountPath: ltree('account_path').notNull(),
  provider: dtext('provider', { enum: ['stripe', 'paymongo', 'manual'] }).notNull(),
  providerId: dtext('provider_id').unique(),
  status: dtext('status', { enum: ['pending', 'succeeded', 'failed', 'refunded'] }).notNull().default('pending'),
  amount: dnumeric('amount', { precision: 18, scale: 2 }).notNull(),
  currency: dchar('currency', { length: 3 }).notNull().default('USD'),
  receiptUrl: dtext('receipt_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    accountIdx: dindex('payment_account_idx').on(table.accountId),
  };
});

export const refunds = dpgTable('refunds', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: duuid('public_id').notNull().defaultRandom().unique(),
  paymentId: dbigint('payment_id', { mode: 'number' }).notNull().references(() => payments.id),
  accountId: dbigint('account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  accountPath: ltree('account_path').notNull(),
  providerRefundId: dtext('provider_refund_id').unique(),
  amount: dnumeric('amount', { precision: 18, scale: 2 }).notNull(),
  currency: dchar('currency', { length: 3 }).notNull().default('USD'),
  reason: dtext('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    paymentIdx: dindex('refund_payment_idx').on(table.paymentId),
    accountIdx: dindex('refund_account_idx').on(table.accountId),
  };
});

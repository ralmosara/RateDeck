import { pgTable as dpgTable, bigint as dbigint, text as dtext, uuid as duuid, char as dchar, timestamp, numeric as dnumeric, index as dindex } from 'drizzle-orm/pg-core';
import { ltree } from './_types';
import { accounts } from './core';

export const ledgerTransactions = dpgTable('ledger_transactions', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: duuid('public_id').notNull().defaultRandom().unique(),
  accountId: dbigint('account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  accountPath: ltree('account_path').notNull(),
  type: dtext('type', { enum: ['deposit', 'charge', 'refund', 'adjustment'] }).notNull(),
  referenceType: dtext('reference_type'), // e.g. 'invoice', 'payment_intent', 'cdr'
  referenceId: dtext('reference_id'),
  description: dtext('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    accountIdx: dindex('ledger_tx_account_idx').on(table.accountId),
  };
});

export const ledgerEntries = dpgTable('ledger_entries', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  transactionId: dbigint('transaction_id', { mode: 'number' }).notNull().references(() => ledgerTransactions.id, { onDelete: 'cascade' }),
  accountId: dbigint('account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  accountPath: ltree('account_path').notNull(),
  direction: dtext('direction', { enum: ['credit', 'debit'] }).notNull(),
  amount: dnumeric('amount', { precision: 20, scale: 8 }).notNull(),
  currency: dchar('currency', { length: 3 }).notNull().default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    txIdx: dindex('ledger_entry_tx_idx').on(table.transactionId),
    accountIdx: dindex('ledger_entry_account_idx').on(table.accountId),
  };
});

export const invoices = dpgTable('invoices', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: duuid('public_id').notNull().defaultRandom().unique(),
  accountId: dbigint('account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  accountPath: ltree('account_path').notNull(),
  invoiceNumber: dtext('invoice_number').notNull().unique(),
  status: dtext('status', { enum: ['draft', 'open', 'paid', 'void', 'uncollectible'] }).notNull().default('draft'),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  subtotal: dnumeric('subtotal', { precision: 20, scale: 8 }).notNull().default('0'),
  taxes: dnumeric('taxes', { precision: 20, scale: 8 }).notNull().default('0'),
  total: dnumeric('total', { precision: 20, scale: 8 }).notNull().default('0'),
  currency: dchar('currency', { length: 3 }).notNull().default('USD'),
  pdfUrl: dtext('pdf_url'),
  stripeInvoiceId: dtext('stripe_invoice_id'),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  dueAt: timestamp('due_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceLines = dpgTable('invoice_lines', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  invoiceId: dbigint('invoice_id', { mode: 'number' }).notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  description: dtext('description').notNull(),
  quantity: dnumeric('quantity', { precision: 20, scale: 8 }).notNull().default('1'),
  unitPrice: dnumeric('unit_price', { precision: 20, scale: 8 }).notNull(),
  amount: dnumeric('amount', { precision: 20, scale: 8 }).notNull(),
  metadata: dtext('metadata'), // Could be jsonb
});

export const plans = dpgTable('plans', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: duuid('public_id').notNull().defaultRandom().unique(),
  name: dtext('name').notNull(),
  description: dtext('description'),
  monthlyFee: dnumeric('monthly_fee', { precision: 18, scale: 2 }).notNull().default('0'),
  currency: dchar('currency', { length: 3 }).notNull().default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = dpgTable('products', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: duuid('public_id').notNull().defaultRandom().unique(),
  name: dtext('name').notNull(),
  sku: dtext('sku').unique(),
  price: dnumeric('price', { precision: 18, scale: 2 }).notNull(),
  currency: dchar('currency', { length: 3 }).notNull().default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = dpgTable('subscriptions', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: duuid('public_id').notNull().defaultRandom().unique(),
  accountId: dbigint('account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  accountPath: ltree('account_path').notNull(),
  planId: dbigint('plan_id', { mode: 'number' }).notNull().references(() => plans.id),
  status: dtext('status', { enum: ['active', 'canceled', 'past_due', 'trialing'] }).notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const billingCycles = dpgTable('billing_cycles', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  accountId: dbigint('account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  accountPath: ltree('account_path').notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  status: dtext('status', { enum: ['open', 'closing', 'closed'] }).notNull().default('open'),
  invoiceId: dbigint('invoice_id', { mode: 'number' }).references(() => invoices.id),
});

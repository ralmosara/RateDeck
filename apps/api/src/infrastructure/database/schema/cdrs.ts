import { pgTable as dpgTable, bigint as dbigint, text as dtext, uuid as duuid, char as dchar, integer as dinteger, smallint as dsmallint, numeric as dnumeric, index as dindex, unique as dunique, timestamp, primaryKey, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { accounts } from './core';
import { rateDeckVersions } from './rates';
import { trunks } from './carriers';

const ltree = customType<{ data: string }>({
  dataType() {
    return 'ltree';
  },
});

export const cdrImports = dpgTable('cdr_imports', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: duuid('public_id').notNull().defaultRandom().unique(),
  accountId: dbigint('account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  accountPath: ltree('account_path').notNull(),
  status: dtext('status', { enum: ['queued', 'processing', 'completed', 'failed'] }).notNull().default('queued'),
  sourceFileSha256: dtext('source_file_sha256').notNull(),
  rowCount: dinteger('row_count').notNull().default(0),
  importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cdrs = dpgTable('cdrs', {
  id: dbigint('id', { mode: 'number' }).generatedAlwaysAsIdentity(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  accountId: dbigint('account_id', { mode: 'number' }).notNull(),
  accountPath: ltree('account_path').notNull(),
  sourceId: dsmallint('source_id').notNull(),
  externalCallId: dtext('external_call_id').notNull(),
  caller: dtext('caller'),
  callee: dtext('callee').notNull(),
  durationSec: dinteger('duration_sec').notNull(),
  disposition: dtext('disposition').notNull(), // ANSWERED, NO_ANSWER, BUSY, FAILED
  trunkId: dbigint('trunk_id', { mode: 'number' }).references(() => trunks.id),
  
  // Rating outputs
  ratingStatus: dsmallint('rating_status').notNull().default(0), // 0: pending, 1: rated, 2: unrateable
  matchedPrefix: dtext('matched_prefix'),
  billedSec: dinteger('billed_sec'),
  costAmount: dnumeric('cost_amount', { precision: 20, scale: 8 }),
  sellAmount: dnumeric('sell_amount', { precision: 20, scale: 8 }),
  resellerSellAmount: dnumeric('reseller_sell_amount', { precision: 20, scale: 8 }),
  ratedDeckVersionId: dbigint('rated_deck_version_id', { mode: 'number' }).references(() => rateDeckVersions.id),
  ratingRunId: dbigint('rating_run_id', { mode: 'number' }),
  invoiceId: dbigint('invoice_id', { mode: 'number' }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.startTime, table.id] }),
    dedupUnique: dunique().on(table.startTime, table.sourceId, table.externalCallId),
    unratedIdx: dindex('cdrs_unrated_idx').on(table.ratingStatus).where(sql`rating_status = 0`),
  };
});

export const usageDailySummary = dpgTable('usage_daily_summary', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  accountId: dbigint('account_id', { mode: 'number' }).notNull(),
  accountPath: ltree('account_path').notNull(),
  day: timestamp('day', { withTimezone: true }).notNull(),
  destination: dtext('destination').notNull(),
  deckVersionId: dbigint('deck_version_id', { mode: 'number' }).notNull(),
  totalCalls: dinteger('total_calls').notNull().default(0),
  totalDurationSec: dinteger('total_duration_sec').notNull().default(0),
  totalBilledSec: dinteger('total_billed_sec').notNull().default(0),
  totalCostAmount: dnumeric('total_cost_amount', { precision: 20, scale: 8 }).notNull().default('0'),
  totalSellAmount: dnumeric('total_sell_amount', { precision: 20, scale: 8 }).notNull().default('0'),
}, (table) => {
  return {
    upsertUnique: dunique().on(table.accountId, table.day, table.destination, table.deckVersionId),
  };
});

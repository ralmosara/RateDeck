import { pgTable as dpgTable, bigint as dbigint, text as dtext, uuid as duuid, char as dchar, timestamp, numeric as dnumeric, index as dindex } from 'drizzle-orm/pg-core';
import { ltree } from './_types';
import { accounts } from './core';

export const dids = dpgTable('dids', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: duuid('public_id').notNull().defaultRandom().unique(),
  number: dtext('number').notNull().unique(), // E.164
  countryCode: dchar('country_code', { length: 2 }).notNull(),
  status: dtext('status', { enum: ['available', 'reserved', 'assigned', 'porting'] }).notNull().default('available'),
  monthlyCost: dnumeric('monthly_cost', { precision: 18, scale: 2 }).notNull().default('0'),
  currency: dchar('currency', { length: 3 }).notNull().default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const didAssignments = dpgTable('did_assignments', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  didId: dbigint('did_id', { mode: 'number' }).notNull().references(() => dids.id),
  accountId: dbigint('account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  accountPath: ltree('account_path').notNull(),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  unassignedAt: timestamp('unassigned_at', { withTimezone: true }),
}, (table) => {
  return {
    accountIdx: dindex('did_assignment_account_idx').on(table.accountId),
    didIdx: dindex('did_assignment_did_idx').on(table.didId),
  };
});

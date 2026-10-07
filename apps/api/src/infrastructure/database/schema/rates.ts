
import { pgTable as dpgTable, bigint as dbigint, text as dtext, uuid as duuid, char as dchar, integer as dinteger, smallint as dsmallint, numeric as dnumeric, index as dindex, unique as dunique, check as dcheck, customType, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { accounts, users } from './core';

// Ltree custom type
const ltree = customType<{ data: string }>({
  dataType() {
    return 'ltree';
  },
});

// Tstzrange custom type
const tstzrange = customType<{ data: string }>({
  dataType() {
    return 'tstzrange';
  },
});

export const rateDecks = dpgTable('rate_decks', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: duuid('public_id').notNull().defaultRandom().unique(),
  ownerAccountId: dbigint('owner_account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  accountPath: ltree('account_path').notNull(),
  kind: dtext('kind').notNull(),
  parentDeckId: dbigint('parent_deck_id', { mode: 'number' }),
  currency: dchar('currency', { length: 3 }).notNull(),
  name: dtext('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rateDeckVersions = dpgTable('rate_deck_versions', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: duuid('public_id').notNull().defaultRandom().unique(),
  deckId: dbigint('deck_id', { mode: 'number' }).notNull().references(() => rateDecks.id),
  accountPath: ltree('account_path').notNull(),
  version: dinteger('version').notNull(),
  status: dtext('status').notNull(),
  effective: tstzrange('effective').notNull(),
  sourceFileSha256: dtext('source_file_sha256'),
  publishedBy: dbigint('published_by', { mode: 'number' }).references(() => users.id),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    deckVersionUnique: dunique().on(table.deckId, table.version),
  };
});

export const rates = dpgTable('rates', {
  id: dbigint('id', { mode: 'number' }).generatedAlwaysAsIdentity(),
  deckVersionId: dbigint('deck_version_id', { mode: 'number' }).notNull().references(() => rateDeckVersions.id, { onDelete: 'cascade' }),
  accountPath: ltree('account_path').notNull(),
  prefix: dtext('prefix').notNull(),
  destination: dtext('destination').notNull(),
  ratePerMin: dnumeric('rate_per_min', { precision: 20, scale: 8 }).notNull(),
  connectionFee: dnumeric('connection_fee', { precision: 20, scale: 8 }).notNull().default('0'),
  incrementFirst: dsmallint('increment_first').notNull().default(60),
  incrementNext: dsmallint('increment_next').notNull().default(60),
  effective: tstzrange('effective').notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.deckVersionId, table.id] }),
    prefixIdx: dindex('rates_prefix_idx').on(table.deckVersionId, table.prefix),
  };
});

export const markupRules = dpgTable('markup_rules', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  deckId: dbigint('deck_id', { mode: 'number' }).notNull().references(() => rateDecks.id, { onDelete: 'cascade' }),
  prefixMatch: dtext('prefix_match').notNull(), // e.g. "44", "1", or "*" for default
  markupPercentage: dnumeric('markup_percentage', { precision: 10, scale: 4 }).notNull().default('0'), // e.g. "10.0000" for 10%
  fixedAddition: dnumeric('fixed_addition', { precision: 20, scale: 8 }).notNull().default('0'), // e.g. "0.005"
  overrideRate: dnumeric('override_rate', { precision: 20, scale: 8 }), // If set, ignore markup percentage and fixed addition
});

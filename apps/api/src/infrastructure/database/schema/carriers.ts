import { pgTable, bigint, text, uuid, timestamp } from 'drizzle-orm/pg-core';
import { ltree } from './_types';
import { accounts } from './core';

export const carriers = pgTable('carriers', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: uuid('public_id').notNull().defaultRandom().unique(),
  accountId: bigint('account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  accountPath: ltree('account_path').notNull(),
  name: text('name').notNull(),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const trunks = pgTable('trunks', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: uuid('public_id').notNull().defaultRandom().unique(),
  carrierId: bigint('carrier_id', { mode: 'number' }).references(() => carriers.id), // Null for customer trunks
  accountId: bigint('account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  accountPath: ltree('account_path').notNull(),
  name: text('name').notNull(),
  direction: text('direction', { enum: ['inbound', 'outbound', 'both'] }).notNull(),
  host: text('host').notNull(),
  authUsername: text('auth_username'),
  authPassword: text('auth_password'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

import { pgTable as dpgTable, bigint as dbigint, text as dtext, uuid as duuid, timestamp, boolean as dboolean, index as dindex } from 'drizzle-orm/pg-core';
import { ltree } from './_types';
import { accounts } from './core';

export const webhookEndpoints = dpgTable('webhook_endpoints', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: duuid('public_id').notNull().defaultRandom().unique(),
  accountId: dbigint('account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  accountPath: ltree('account_path').notNull(),
  url: dtext('url').notNull(),
  secret: dtext('secret').notNull(),
  active: dboolean('active').notNull().default(true),
  // Commma-separated list or JSON array of event types (e.g. 'invoice.created,cdr.rated')
  events: dtext('events').notNull().default('*'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const webhookDeliveries = dpgTable('webhook_deliveries', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: duuid('public_id').notNull().defaultRandom().unique(),
  endpointId: dbigint('endpoint_id', { mode: 'number' }).notNull().references(() => webhookEndpoints.id, { onDelete: 'cascade' }),
  accountId: dbigint('account_id', { mode: 'number' }).notNull(),
  accountPath: ltree('account_path').notNull(),
  eventType: dtext('event_type').notNull(),
  payload: dtext('payload').notNull(), // JSON string
  status: dtext('status', { enum: ['pending', 'success', 'failed'] }).notNull().default('pending'),
  statusCode: dbigint('status_code', { mode: 'number' }),
  responseBody: dtext('response_body'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
}, (table) => {
  return {
    endpointIdx: dindex('webhook_delivery_endpoint_idx').on(table.endpointId),
    statusIdx: dindex('webhook_delivery_status_idx').on(table.status),
  };
});

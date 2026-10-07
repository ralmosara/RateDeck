import { pgTable as dpgTable, bigint as dbigint, text as dtext, uuid as duuid, timestamp, index as dindex } from 'drizzle-orm/pg-core';
import { ltree } from './_types';
import { accounts, users } from './core';

export const tickets = dpgTable('tickets', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: duuid('public_id').notNull().defaultRandom().unique(),
  accountId: dbigint('account_id', { mode: 'number' }).notNull().references(() => accounts.id),
  accountPath: ltree('account_path').notNull(),
  subject: dtext('subject').notNull(),
  status: dtext('status', { enum: ['open', 'in_progress', 'resolved', 'closed'] }).notNull().default('open'),
  priority: dtext('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).notNull().default('medium'),
  createdBy: dbigint('created_by', { mode: 'number' }).notNull().references(() => users.id),
  assignedTo: dbigint('assigned_to', { mode: 'number' }).references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    accountIdx: dindex('tickets_account_idx').on(table.accountId),
    statusIdx: dindex('tickets_status_idx').on(table.status),
  };
});

export const ticketMessages = dpgTable('ticket_messages', {
  id: dbigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  ticketId: dbigint('ticket_id', { mode: 'number' }).notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  authorId: dbigint('author_id', { mode: 'number' }).notNull().references(() => users.id),
  body: dtext('body').notNull(),
  isInternalNote: dtext('is_internal_note').notNull().default('false'), // Using text 'true'/'false' for simplicity or boolean type
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

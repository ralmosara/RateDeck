import { pgTable, serial, varchar, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { ltree } from './_types';
import { accounts, users } from './core';

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').references(() => accounts.id).notNull(),
  accountPath: ltree('account_path').notNull(),
  userId: integer('user_id').references(() => users.id), // Nullable if account-wide alert
  type: varchar('type', { length: 50 }).notNull(), // 'low_balance', 'ticket_update', 'invoice_ready'
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

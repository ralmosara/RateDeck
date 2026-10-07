import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { citext, ltree } from './_types';

/**
 * Typed query model. DDL source of truth is SQL in /migrations (ADR-0005):
 * partitions, RLS, EXCLUDE constraints and ltree indexes are not expressible in drizzle-kit.
 */

export const accounts = pgTable(
  'accounts',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    publicId: uuid('public_id').notNull().unique().default(sql`gen_random_uuid()`),
    parentId: bigint('parent_id', { mode: 'number' }),
    type: text('type', { enum: ['platform', 'reseller', 'customer', 'sub_account'] }).notNull(),
    path: ltree('path').notNull(),
    name: text('name').notNull(),
    status: text('status', { enum: ['active', 'suspended', 'closed'] }).notNull().default('active'),
    currency: char('currency', { length: 3 }).notNull(),
    timezone: text('timezone').notNull(),
    billingMode: text('billing_mode', { enum: ['prepaid', 'postpaid'] }).notNull().default('prepaid'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('accounts_parent_idx').on(t.parentId)],
);

export const users = pgTable('users', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  publicId: uuid('public_id').notNull().unique().default(sql`gen_random_uuid()`),
  accountId: bigint('account_id', { mode: 'number' }).notNull(),
  accountPath: ltree('account_path').notNull(),
  email: citext('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  status: text('status', { enum: ['active', 'locked', 'disabled'] }).notNull().default('active'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable('roles', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  key: text('key').notNull().unique(), // admin | reseller | customer | + custom
  name: text('name').notNull(),
  builtIn: boolean('built_in').notNull().default(false),
});

export const permissions = pgTable('permissions', {
  key: text('key').primaryKey(), // e.g. rate_deck:publish
  description: text('description').notNull(),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: bigint('role_id', { mode: 'number' }).notNull(),
    permissionKey: text('permission_key').notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionKey] })],
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    roleId: bigint('role_id', { mode: 'number' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: bigint('id', { mode: 'number' }).generatedAlwaysAsIdentity(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    accountPath: ltree('account_path').notNull(),
    actorUserId: bigint('actor_user_id', { mode: 'number' }),
    effectiveUserId: bigint('effective_user_id', { mode: 'number' }),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    correlationId: text('correlation_id'),
    changes: jsonb('changes'),
  },
  (t) => [primaryKey({ columns: [t.occurredAt, t.id] })],
);

export const outbox = pgTable('outbox', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  aggregateType: text('aggregate_type').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
});

export const mfaFactors = pgTable('mfa_factors', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint('user_id', { mode: 'number' }).notNull(),
  type: text('type', { enum: ['totp'] }).notNull(),
  secret: text('secret').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const apiTokens = pgTable('api_tokens', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  accountId: bigint('account_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  permissions: jsonb('permissions'),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint('user_id', { mode: 'number' }).notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const impersonationSessions = pgTable('impersonation_sessions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  adminUserId: bigint('admin_user_id', { mode: 'number' }).notNull(),
  targetUserId: bigint('target_user_id', { mode: 'number' }).notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

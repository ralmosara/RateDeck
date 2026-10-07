-- 0001_baseline.sql
-- Phase 0/1 foundation: accounts hierarchy, IAM, audit log (partitioned), outbox, RLS.
-- See docs/adr/0004 (tenancy & RLS) and docs/adr/0005 (SQL-first migrations).

-------------------------------------------------------------------------------
-- Helpers
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Current tenant scope from the transaction-local GUC. NULL when unset, so policies
-- fail closed (an empty ltree '' would otherwise be an ancestor of everything).
CREATE OR REPLACE FUNCTION app_scope() RETURNS ltree LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.scope', true), '')::ltree
$$;

-- Creates [month, month+1) partition for a RANGE-partitioned table if missing.
CREATE OR REPLACE FUNCTION ensure_monthly_partition(parent regclass, month date)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  start_ts date := date_trunc('month', month)::date;
  end_ts   date := (date_trunc('month', month) + interval '1 month')::date;
  part     text := format('%s_%s', parent::text, to_char(start_ts, 'YYYYMM'));
BEGIN
  IF to_regclass(part) IS NULL THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF %s FOR VALUES FROM (%L) TO (%L)',
      part, parent, start_ts, end_ts
    );
    -- Direct partition access would bypass parent RLS; force access via the parent.
    EXECUTE format('REVOKE ALL ON %I FROM ratedeck_app', part);
  END IF;
END $$;

-------------------------------------------------------------------------------
-- Accounts hierarchy
-------------------------------------------------------------------------------
CREATE TABLE accounts (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id     uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  parent_id     bigint REFERENCES accounts(id),
  type          text NOT NULL CHECK (type IN ('platform','reseller','customer','sub_account')),
  path          ltree NOT NULL UNIQUE,
  name          text NOT NULL,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  currency      char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  timezone      text NOT NULL,
  billing_mode  text NOT NULL DEFAULT 'prepaid' CHECK (billing_mode IN ('prepaid','postpaid')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((type = 'platform') = (parent_id IS NULL))
);
CREATE INDEX accounts_path_gist ON accounts USING gist (path);
CREATE INDEX accounts_parent_idx ON accounts (parent_id);
CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-------------------------------------------------------------------------------
-- IAM
-------------------------------------------------------------------------------
CREATE TABLE users (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id      uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  account_id     bigint NOT NULL REFERENCES accounts(id),
  account_path   ltree NOT NULL,
  email          citext NOT NULL UNIQUE,
  password_hash  text NOT NULL,
  display_name   text NOT NULL,
  mfa_enabled    boolean NOT NULL DEFAULT false,
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','locked','disabled')),
  last_login_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX users_account_path_gist ON users USING gist (account_path);

CREATE TABLE roles (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key       text NOT NULL UNIQUE,
  name      text NOT NULL,
  built_in  boolean NOT NULL DEFAULT false
);

CREATE TABLE permissions (
  key          text PRIMARY KEY CHECK (key ~ '^[a-z_]+:[a-z_]+$'),
  description  text NOT NULL
);

CREATE TABLE role_permissions (
  role_id         bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_key  text NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE user_roles (
  user_id  bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id  bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-------------------------------------------------------------------------------
-- Audit log (append-only, monthly partitions)
-------------------------------------------------------------------------------
CREATE TABLE audit_log (
  id                 bigint GENERATED ALWAYS AS IDENTITY,
  occurred_at        timestamptz NOT NULL DEFAULT now(),
  account_path       ltree NOT NULL,
  actor_user_id      bigint,
  effective_user_id  bigint,          -- differs from actor during impersonation (BR-08)
  action             text NOT NULL,
  resource_type      text NOT NULL,
  resource_id        text,
  ip                 inet,
  user_agent         text,
  correlation_id     text,
  changes            jsonb,
  PRIMARY KEY (occurred_at, id)
) PARTITION BY RANGE (occurred_at);
CREATE INDEX audit_log_path_gist ON audit_log USING gist (account_path);
CREATE INDEX audit_log_resource_idx ON audit_log (resource_type, resource_id, occurred_at DESC);

DO $$
DECLARE m date;
BEGIN
  FOR m IN SELECT generate_series(date_trunc('month', now()) - interval '1 month',
                                  date_trunc('month', now()) + interval '3 months',
                                  interval '1 month')::date
  LOOP
    PERFORM ensure_monthly_partition('audit_log', m);
  END LOOP;
END $$;

-- Append-only enforcement for the application role.
REVOKE UPDATE, DELETE ON audit_log FROM ratedeck_app;

-------------------------------------------------------------------------------
-- Transactional outbox (ADR-0006)
-------------------------------------------------------------------------------
CREATE TABLE outbox (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  aggregate_type  text NOT NULL,
  aggregate_id    text NOT NULL,
  event_type      text NOT NULL,
  payload         jsonb NOT NULL,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  published_at    timestamptz
);
CREATE INDEX outbox_unpublished_idx ON outbox (id) WHERE published_at IS NULL;

-------------------------------------------------------------------------------
-- Row-Level Security (defence in depth under CASL authorisation)
-------------------------------------------------------------------------------
ALTER TABLE accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON accounts  USING (path <@ app_scope())         WITH CHECK (path <@ app_scope());
CREATE POLICY tenant_scope ON users     USING (account_path <@ app_scope()) WITH CHECK (account_path <@ app_scope());
CREATE POLICY tenant_scope ON audit_log USING (account_path <@ app_scope()) WITH CHECK (account_path <@ app_scope());

-------------------------------------------------------------------------------
-- Grants for runtime role (tables created after ALTER DEFAULT PRIVILEGES are covered,
-- but be explicit so the migration is self-contained).
-------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON accounts, users, roles, permissions, role_permissions, user_roles, outbox TO ratedeck_app;
GRANT SELECT, INSERT ON audit_log TO ratedeck_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ratedeck_app;

-------------------------------------------------------------------------------
-- Built-in roles & permissions (seed reference data)
-------------------------------------------------------------------------------
INSERT INTO roles (key, name, built_in) VALUES
  ('admin', 'Platform Administrator', true),
  ('reseller', 'Reseller', true),
  ('customer', 'Customer', true);

INSERT INTO permissions (key, description) VALUES
  ('account:read', 'View accounts in scope'),
  ('account:manage', 'Create/update accounts in scope'),
  ('account:impersonate', 'Impersonate accounts below own level'),
  ('rate_deck:read', 'View rate decks'),
  ('rate_deck:manage', 'Import and edit draft rate decks'),
  ('rate_deck:publish', 'Publish rate deck versions'),
  ('cdr:read', 'Search and export call records'),
  ('cdr:import', 'Import call records'),
  ('invoice:read', 'View invoices'),
  ('invoice:manage', 'Run billing, issue credit notes'),
  ('payment:read', 'View payments'),
  ('payment:write', 'Make payments and top-ups'),
  ('report:read', 'View reports'),
  ('audit:read', 'View audit log'),
  ('settings:manage', 'Manage system settings');

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM roles r CROSS JOIN permissions p WHERE r.key = 'admin';

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM roles r JOIN permissions p ON p.key IN (
  'account:read','account:manage','account:impersonate','rate_deck:read','rate_deck:manage',
  'rate_deck:publish','cdr:read','invoice:read','payment:read','report:read','audit:read'
) WHERE r.key = 'reseller';

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM roles r JOIN permissions p ON p.key IN (
  'account:read','cdr:read','invoice:read','payment:read','payment:write','report:read'
) WHERE r.key = 'customer';

-- Platform root account.
INSERT INTO accounts (type, path, name, currency, timezone, billing_mode)
VALUES ('platform', 'root', 'RateDeck Platform', 'USD', 'UTC', 'postpaid');

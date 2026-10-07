-- 0003_billing_and_operations.sql
-- Add Billing, CDRs, Webhooks, Tickets, and remaining Rate features

-- CDR Imports and CDRs
CREATE TABLE cdr_imports (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  public_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  account_id bigint NOT NULL REFERENCES accounts(id),
  account_path ltree NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  source_file_sha256 text NOT NULL,
  row_count int NOT NULL DEFAULT 0,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cdrs (
  id bigint GENERATED ALWAYS AS IDENTITY,
  start_time timestamptz NOT NULL,
  account_id bigint NOT NULL REFERENCES accounts(id),
  account_path ltree NOT NULL,
  source_id smallint NOT NULL,
  external_call_id text NOT NULL,
  caller text,
  callee text NOT NULL,
  duration_sec int NOT NULL,
  disposition text NOT NULL,
  trunk_id bigint,
  rating_status smallint NOT NULL DEFAULT 0,
  matched_prefix text,
  billed_sec int,
  cost_amount numeric(20, 8),
  sell_amount numeric(20, 8),
  reseller_sell_amount numeric(20, 8),
  rated_deck_version_id bigint REFERENCES rate_deck_versions(id),
  rating_run_id bigint,
  invoice_id bigint,
  PRIMARY KEY (start_time, id),
  UNIQUE (start_time, source_id, external_call_id)
);
CREATE INDEX cdrs_unrated_idx ON cdrs (rating_status) WHERE rating_status = 0;

-- Carriers and Trunks
CREATE TABLE carriers (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  public_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  account_id bigint NOT NULL REFERENCES accounts(id),
  account_path ltree NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trunks (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  public_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  carrier_id bigint REFERENCES carriers(id),
  account_id bigint NOT NULL REFERENCES accounts(id),
  account_path ltree NOT NULL,
  name text NOT NULL,
  direction text NOT NULL,
  host text NOT NULL,
  auth_username text,
  auth_password text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Invoices and strict Double-Entry Ledger
CREATE TABLE invoices (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  public_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  account_id bigint NOT NULL REFERENCES accounts(id),
  account_path ltree NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  subtotal numeric(20, 8) NOT NULL DEFAULT 0,
  taxes numeric(20, 8) NOT NULL DEFAULT 0,
  total numeric(20, 8) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'USD',
  pdf_url text,
  stripe_invoice_id text,
  issued_at timestamptz,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ledger_transactions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  public_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  account_id bigint NOT NULL REFERENCES accounts(id),
  account_path ltree NOT NULL,
  type text NOT NULL,
  reference_type text,
  reference_id text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_tx_account_idx ON ledger_transactions(account_id);

CREATE TABLE ledger_entries (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  transaction_id bigint NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
  account_id bigint NOT NULL REFERENCES accounts(id),
  account_path ltree NOT NULL,
  direction text NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount numeric(20, 8) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_entry_tx_idx ON ledger_entries(transaction_id);
CREATE INDEX ledger_entry_account_idx ON ledger_entries(account_id);

-- Usage Summary
CREATE TABLE usage_daily_summary (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  account_id bigint NOT NULL REFERENCES accounts(id),
  account_path ltree NOT NULL,
  day timestamptz NOT NULL,
  destination text NOT NULL,
  deck_version_id bigint NOT NULL REFERENCES rate_deck_versions(id),
  total_calls int NOT NULL DEFAULT 0,
  total_duration_sec int NOT NULL DEFAULT 0,
  total_billed_sec int NOT NULL DEFAULT 0,
  total_cost_amount numeric(20, 8) NOT NULL DEFAULT 0,
  total_sell_amount numeric(20, 8) NOT NULL DEFAULT 0,
  UNIQUE (account_id, day, destination, deck_version_id)
);

-- Webhooks
CREATE TABLE webhook_endpoints (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  public_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  account_id bigint NOT NULL REFERENCES accounts(id),
  account_path ltree NOT NULL,
  url text NOT NULL,
  secret text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  events text NOT NULL DEFAULT '*',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE webhook_deliveries (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  public_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  endpoint_id bigint NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  account_id bigint NOT NULL REFERENCES accounts(id),
  account_path ltree NOT NULL,
  event_type text NOT NULL,
  payload text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  status_code bigint,
  response_body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);
CREATE INDEX webhook_delivery_endpoint_idx ON webhook_deliveries(endpoint_id);
CREATE INDEX webhook_delivery_status_idx ON webhook_deliveries(status);

-- Tickets
CREATE TABLE tickets (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  public_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  account_id bigint NOT NULL REFERENCES accounts(id),
  account_path ltree NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  created_by bigint NOT NULL REFERENCES users(id),
  assigned_to bigint REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tickets_account_idx ON tickets(account_id);
CREATE INDEX tickets_status_idx ON tickets(status);

CREATE TABLE ticket_messages (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ticket_id bigint NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id bigint NOT NULL REFERENCES users(id),
  body text NOT NULL,
  is_internal_note boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Markup Rules
CREATE TABLE markup_rules (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  deck_id bigint NOT NULL REFERENCES rate_decks(id) ON DELETE CASCADE,
  prefix_match text NOT NULL,
  markup_percentage numeric(10, 4) NOT NULL DEFAULT 0,
  fixed_addition numeric(20, 8) NOT NULL DEFAULT 0,
  override_rate numeric(20, 8)
);

-- RLS Enforcement
ALTER TABLE cdr_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_daily_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY cdr_imports_iso ON cdr_imports FOR ALL TO ratedeck_app USING (account_path <@ app_scope());
CREATE POLICY cdrs_iso ON cdrs FOR ALL TO ratedeck_app USING (account_path <@ app_scope());
CREATE POLICY carriers_iso ON carriers FOR ALL TO ratedeck_app USING (account_path <@ app_scope());
CREATE POLICY trunks_iso ON trunks FOR ALL TO ratedeck_app USING (account_path <@ app_scope());
CREATE POLICY invoices_iso ON invoices FOR ALL TO ratedeck_app USING (account_path <@ app_scope());
CREATE POLICY ledger_tx_iso ON ledger_transactions FOR ALL TO ratedeck_app USING (account_path <@ app_scope());
CREATE POLICY ledger_en_iso ON ledger_entries FOR ALL TO ratedeck_app USING (account_path <@ app_scope());
CREATE POLICY webhook_ep_iso ON webhook_endpoints FOR ALL TO ratedeck_app USING (account_path <@ app_scope());
CREATE POLICY webhook_del_iso ON webhook_deliveries FOR ALL TO ratedeck_app USING (account_path <@ app_scope());
CREATE POLICY tickets_iso ON tickets FOR ALL TO ratedeck_app USING (account_path <@ app_scope());
-- ticket_messages rely on the parent ticket's RLS or we can do a subquery, but simplest is app role
CREATE POLICY usage_iso ON usage_daily_summary FOR ALL TO ratedeck_app USING (account_path <@ app_scope());

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ratedeck_app;


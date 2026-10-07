-- Rate Management Tables

CREATE TABLE rate_decks (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  public_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  owner_account_id bigint NOT NULL REFERENCES accounts(id),
  account_path ltree NOT NULL,
  kind text NOT NULL CHECK (kind IN ('carrier_cost','wholesale','markup')),
  parent_deck_id bigint REFERENCES rate_decks(id),
  currency char(3) NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE rate_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY rate_decks_isolation ON rate_decks 
  FOR ALL TO ratedeck_app 
  USING (account_path <@ current_setting('app.scope')::ltree);

CREATE TABLE rate_deck_versions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  public_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  deck_id bigint NOT NULL REFERENCES rate_decks(id),
  account_path ltree NOT NULL,
  version int NOT NULL,
  status text NOT NULL CHECK (status IN ('draft','validating','published','archived')),
  effective tstzrange NOT NULL,
  source_file_sha256 text,
  published_by bigint REFERENCES users(id),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deck_id, version)
);

-- RLS
ALTER TABLE rate_deck_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY rate_deck_versions_isolation ON rate_deck_versions 
  FOR ALL TO ratedeck_app 
  USING (account_path <@ current_setting('app.scope')::ltree);

CREATE TABLE rates (
  id bigint GENERATED ALWAYS AS IDENTITY,
  deck_version_id bigint NOT NULL REFERENCES rate_deck_versions(id) ON DELETE CASCADE,
  account_path ltree NOT NULL,
  prefix text NOT NULL CHECK (prefix ~ '^[0-9]{1,16}$'),
  destination text NOT NULL,
  rate_per_min numeric(20,8) NOT NULL CHECK (rate_per_min >= 0),
  connection_fee numeric(20,8) NOT NULL DEFAULT 0,
  increment_first smallint NOT NULL DEFAULT 60,
  increment_next smallint NOT NULL DEFAULT 60,
  effective tstzrange NOT NULL,
  PRIMARY KEY (deck_version_id, id),
  EXCLUDE USING gist (deck_version_id WITH =, prefix WITH =, effective WITH &&)
);
CREATE INDEX rates_prefix_idx ON rates (deck_version_id, prefix);

-- RLS
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY rates_isolation ON rates 
  FOR ALL TO ratedeck_app 
  USING (account_path <@ current_setting('app.scope')::ltree);

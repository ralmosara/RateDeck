-- 0004_cdr_partitions.sql
-- Converts the cdrs table into a partitioned table (ADR-0005)

DROP TABLE IF EXISTS cdrs CASCADE;

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
) PARTITION BY RANGE (start_time);

CREATE INDEX cdrs_unrated_idx ON cdrs (rating_status) WHERE rating_status = 0;

ALTER TABLE cdrs ENABLE ROW LEVEL SECURITY;
CREATE POLICY cdrs_iso ON cdrs FOR ALL TO ratedeck_app USING (account_path <@ app_scope());

GRANT SELECT, INSERT, UPDATE, DELETE ON cdrs TO ratedeck_app;

DO $$
DECLARE m date;
BEGIN
  FOR m IN SELECT generate_series(date_trunc('month', now()) - interval '1 month',
                                  date_trunc('month', now()) + interval '3 months',
                                  interval '1 month')::date
  LOOP
    PERFORM ensure_monthly_partition('cdrs', m);
  END LOOP;
END $$;

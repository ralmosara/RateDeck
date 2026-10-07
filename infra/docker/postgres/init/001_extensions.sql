-- Runs once on first container start (empty data volume).
-- Extensions required by the RateDeck schema (see docs/adr/0004).
CREATE EXTENSION IF NOT EXISTS ltree;              -- account hierarchy paths
CREATE EXTENSION IF NOT EXISTS btree_gist;         -- EXCLUDE constraints on effective ranges
CREATE EXTENSION IF NOT EXISTS pg_stat_statements; -- query observability
CREATE EXTENSION IF NOT EXISTS citext;             -- case-insensitive emails
CREATE EXTENSION IF NOT EXISTS pgcrypto;           -- gen_random_uuid / digests

-- Application role used at runtime; RLS applies to it (it is NOT the table owner).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ratedeck_app') THEN
    CREATE ROLE ratedeck_app LOGIN PASSWORD 'ratedeck_app' NOBYPASSRLS;
  END IF;
END $$;

GRANT CONNECT ON DATABASE ratedeck TO ratedeck_app;
GRANT USAGE ON SCHEMA public TO ratedeck_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ratedeck_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ratedeck_app;

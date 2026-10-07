# RateDeck Operations Runbook

## Core Architecture Overview
RateDeck is a Node.js/NestJS modular monolith consisting of:
- **API Pods**: Handle HTTP requests.
- **Worker Pods**: (Ingest, Rating, Billing, Integration) Handle BullMQ background jobs.
- **Scheduler Pod**: Leader-elected cron jobs (e.g., triggering invoice runs, partition creation).
- **PostgreSQL 16**: Primary data store (Stateful).
- **Redis 7**: Cache, Pub/Sub, and BullMQ store (Stateful, Ephemeral).

## Routine Operations

### 1. Database Migrations
Migrations are applied using `npm run db:migrate` in the `apps/api` directory.
- Drizzle schema is located at `apps/api/src/infrastructure/database/schema/`.
- Migrations are generated via `drizzle-kit` and stored in `apps/api/migrations/`.
- **WARNING**: Do not alter `.sql` migration files once they have been applied to production.

### 2. CDR Ingestion Management
If the `cdr-import` queue becomes backed up:
- Scale up the `worker-ingest` pods.
- Monitor Redis memory usage; if nearing max memory, stop new uploads temporarily.
- Check the dead-letter queue (DLQ) in BullMQ dashboard for failed parse jobs.

### 3. Rate Deck Publishing
Publishing a rate deck invalidates the trie cache across all rating workers.
- The publishing process sends a Redis Pub/Sub message.
- Rating workers immediately re-fetch the published deck version.
- **Troubleshooting**: If a worker fails to reload a deck, it will continue rating using the old version until restarted, OR it will fail if it's a completely new deck. A rolling restart of `worker-rating` pods can force a cache refresh.

### 4. Billing Cycle Finalization
Invoices are finalized by the `worker-billing` via a cron trigger on the 1st of the month.
- If an invoice generation fails, the job will retry with exponential backoff.
- Failed PDF generation jobs can be re-queued via the admin dashboard.

## Incident Management

### High API Latency (p95 > 250ms)
- **Check Postgres**: Are there long-running queries or lock contention? (`pg_stat_statements`).
- **Check Redis**: Is Redis CPU bound?
- **Scale Out**: Increase API pod replicas.

### Rating Lag (Queue depth increasing)
- The rating queue should stay near 0. If it climbs continuously:
  1. Check if `worker-rating` pods are crashing or OOM (Out of Memory) due to large trie caches.
  2. Scale `worker-rating` up.
  3. Ensure database `UPDATE cdrs` batching is functioning correctly.

### Cross-Tenant Data Leak Suspected
- Immediately invoke the `lock_account` function on suspected breached accounts.
- The application relies on PostgreSQL Row-Level Security (RLS). Review recent schema changes for missing RLS policies (`NOBYPASSRLS`).

## Logs & Metrics
- Logs are structured JSON (Pino) shipped to Loki.
- Metrics are available at `/metrics` (Prometheus format).
  - Key metrics: `cdr_ingested_total`, `rating_lag_seconds`, `queue_depth`, `http_req_duration_ms`.

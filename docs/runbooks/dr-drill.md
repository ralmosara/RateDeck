# Disaster Recovery (DR) Drill Runbook

## Objective
This document outlines the procedure to execute a Disaster Recovery drill for RateDeck. The goal is to prove RPO (Recovery Point Objective) of 0 for billing/ledger data and an RTO (Recovery Time Objective) of < 1 hour in the event of a total primary database failure.

## Prerequisites
- A standby database server or a fresh Postgres 16 instance.
- Access to the latest WAL archive on AWS S3 / MinIO.
- Access to the daily base backup snapshot.
- Administrator access to the production (or staging) environment.

## Scenario: Complete Database Loss

### Step 1: Declare the Incident
- **Time:** T+0
- Notify the NOC team and stakeholders via the #incident-management Slack channel.
- Update the status page to "Major Outage - Investigating".

### Step 2: Stop Ingress and Workers
- Pause all incoming traffic to prevent split-brain and ensure clean failover.
- Scale down the API and Worker pods to 0.
```bash
docker compose scale api=0 worker-ingest=0 worker-rating=0 worker-billing=0 worker-integration=0 scheduler=0
```
*(In Kubernetes: `kubectl scale deploy -l app=ratedeck --replicas=0`)*

### Step 3: Restore Base Backup
- On the new database instance, fetch the latest base backup using `pgBackRest` or `wal-g`.
```bash
pgbackrest --stanza=ratedeck restore
```
- Verify the base backup has been successfully laid out in the Postgres data directory.

### Step 4: Replay WAL Archives (Point-in-Time Recovery)
- Configure `recovery.signal` or `postgresql.auto.conf` to restore up to the exact point of failure.
- Start the PostgreSQL service.
- Monitor the PostgreSQL logs (`/var/log/postgresql/...`) to ensure it successfully fetches and replays WAL segments from S3/MinIO.
- Wait until PostgreSQL reaches a consistent state and accepts connections.

### Step 5: Verify Data Integrity
- Connect to the newly restored database.
- Run the sanity check queries:
```sql
-- Check latest ledger transaction
SELECT * FROM ledger_transactions ORDER BY created_at DESC LIMIT 1;

-- Check latest rated CDR
SELECT * FROM cdrs ORDER BY start_time DESC LIMIT 1;
```
- The timestamps should closely match the known time of the outage, proving RPO = 0 (or minimal data loss).

### Step 6: Repoint the Application
- Update the `DATABASE_URL` secret in the environment (e.g., Vault, AWS Secrets Manager, or `.env` in standalone Docker) to point to the new database IP/hostname.

### Step 7: Restart the Platform
- Scale the API and Worker pods back up to their normal replica counts.
```bash
docker compose scale api=3 worker-ingest=2 worker-rating=4 worker-billing=1 worker-integration=2 scheduler=1
```
- Monitor the application logs for any connection errors.

### Step 8: Validate Operations
- Use the Admin Portal to perform a sanity check:
  - Generate a Rate Quote.
  - View the Billing Dashboard.
  - Upload a test CDR CSV and verify it successfully routes through the ingestion and rating queues.

### Step 9: Incident Resolution
- Mark the DR Drill as complete.
- Update the status page to "Operational".
- Document the actual time taken (Actual RTO) and any data loss (Actual RPO) in the drill report.

## Post-Drill Review
- Conduct a blameless post-mortem if RTO/RPO targets were missed.
- Update this runbook with any missing steps or newly discovered edge cases.

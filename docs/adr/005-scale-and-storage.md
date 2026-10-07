# ADR 005: Scale & Storage Strategy

## Status
Accepted

## Context
RateDeck will generate a massive amount of data, and we need to clarify the expected scale to ensure our architectural choices will hold up.

## Decision
The system is architected for Enterprise Scale (~1B+ CDRs/month).

## Consequences
- We will rely heavily on PostgreSQL's table partitioning (monthly partitions) for raw CDR storage.
- Extensive use of summary tables (`usage_daily_summary`, `usage_monthly_summary`) is mandatory so that dashboards and reports do not query raw partitioned data.
- Once PostgreSQL scaling reaches its limits (or for advanced analytics), we have a clear path to stream data into ClickHouse via Change Data Capture (CDC).

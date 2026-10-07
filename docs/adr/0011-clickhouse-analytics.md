# ADR 0011: ClickHouse for Large-Scale Analytics

## Status
Proposed (Phase 2+)

## Context
PostgreSQL 16 handles partitioned CDRs well into the low billions of rows. However, as our volume exceeds 2 Billion records, running aggregations (ASR, ACD, Revenue by Destination) directly on the `cdrs` table becomes increasingly expensive and impacts primary OLTP performance, even with summary tables.

## Decision
We will introduce **ClickHouse** as our OLAP (Online Analytical Processing) data warehouse for all CDR-related analytics.
- **Ingestion**: We will use Change Data Capture (CDC) via Debezium (or native ClickHouse Materialized PostgreSQL engine) to stream inserted and rated CDRs from PostgreSQL to ClickHouse.
- **Storage**: ClickHouse will store the raw, flattened CDRs using a `MergeTree` engine.
- **Aggregations**: We will utilize ClickHouse `AggregatingMergeTree` to automatically maintain our daily/monthly summaries.
- **Querying**: The `reports` module in our NestJS API will route analytical queries to ClickHouse instead of the PostgreSQL read-replica.

## Consequences
- **Pros**: 
  - Massive improvement in analytical query performance.
  - Offloads heavy read traffic from the primary Postgres DB.
  - Highly compressed column-oriented storage saves disk space.
- **Cons**: 
  - Increased operational complexity (deploying, monitoring, and backing up a ClickHouse cluster).
  - Eventual consistency: Reports will have a slight lag (seconds to minutes) depending on the CDC pipeline.

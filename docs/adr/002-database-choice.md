# ADR 002: Database Choice

## Status
Accepted

## Context
RateDeck will generate a massive amount of data, primarily Call Detail Records (CDRs) and Ledger entries. We need a relational database that scales well, supports multi-tenancy, and allows robust querying.

## Decision
We will use PostgreSQL 16 as our primary transactional database.

## Consequences
- Built-in partitioning supports large tables like CDRs.
- Row-Level Security (RLS) ensures multi-tenant data isolation at the DB layer.
- pg_partman can be used to manage partitions.
- Drizzle ORM will be used to interact with PostgreSQL.

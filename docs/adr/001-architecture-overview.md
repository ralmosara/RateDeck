# ADR 001: Architecture Overview

## Status
Accepted

## Context
We need to define the high-level architecture for the RateDeck enterprise VoIP rating, billing, and reseller platform.

## Decision
We will use a modular monolith architecture for the backend using NestJS, communicating with a PostgreSQL 16 database.
The frontend will be a single React Single Page Application (SPA) providing three portal shells (Admin, Reseller, Customer).
We will use an event-driven approach with a transactional outbox and BullMQ for background workers.

## Consequences
- Single deployable backend simplifies operations.
- Clear module boundaries allow extracting services in the future.
- PostgreSQL will be heavily utilized, requiring careful design for partitioned tables.

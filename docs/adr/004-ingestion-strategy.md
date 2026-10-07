# ADR 004: Ingestion Strategy

## Status
Accepted

## Context
RateDeck needs to ingest CDRs from telecom providers. This can be done via real-time integration (e.g., SIP, FreeSWITCH) or batch offline file uploads.

## Decision
We will support offline CSV import exclusively. We will not support real-time integration with softswitches initially.

## Consequences
- Simplifies the ingestion architecture (no complex real-time SIP event listeners).
- Focus is on batch processing capabilities (e.g. processing 50k-row chunks using BullMQ).
- Suitable for wholesale billing use-cases where carriers provide daily or hourly CDR files.

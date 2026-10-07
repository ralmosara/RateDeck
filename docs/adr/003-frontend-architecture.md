# ADR 003: Frontend Architecture

## Status
Accepted

## Context
RateDeck requires three portals: Admin, Reseller, and Customer. We need to decide how to structure the frontend to support these efficiently without duplicating effort.

## Decision
We will build a single React SPA with three portal shells.
We will use Vite as the bundler, TanStack Router for file-based routing, and TanStack Query for server state management.
We will use a shared design system with white-labeling capabilities via CSS variables.

## Consequences
- Shared components reduce development time.
- Single SPA deployment simplifies CI/CD.
- Code-splitting is required to ensure users only download the code they need (e.g., customers don't download admin features).

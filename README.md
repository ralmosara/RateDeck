# RateDeck 🚀

RateDeck is an enterprise-grade, high-performance Telecom Billing and Rating platform built for carriers, MVNOs, and VoIP providers. It manages the entire lifecycle of wholesale and retail telecommunications billing—from scalable Call Detail Record (CDR) ingestion and dynamic rate-deck parsing, to customer invoicing, reseller management, and payment processing.

## 🏗 Architecture Overview

RateDeck is designed as a **Modular Monolith** scaling into a service-oriented architecture (Day 2 Evolution), built heavily on **NestJS** and **PostgreSQL 16**.

- **API (`apps/api`)**: Core NestJS backend exposing REST and Outbound Webhooks.
- **Worker (`apps/worker`)**: BullMQ queue processor handling async CDR ingest, rating chunks, and PDF invoice generation.
- **Web (`apps/web`)**: React / Vite frontend utilizing TailwindCSS and Radix UI components, with role-based access for Admins, Resellers, and Customers.
- **Seeder (`apps/seeder`)**: High-throughput synthetic CDR generator capable of simulating millions of rows via `COPY FROM STDIN`.
- **Rating Service (`apps/rating-service`)** *(Day 2)*: Extracted ultra-fast Node.js microservice maintaining a PrefixTrie cache for longest-prefix match rating.
- **Auth Service (`apps/auth-service`)** *(Day 2)*: Low-latency SIP Kamailio/FreeSWITCH authorisation API.

## ✨ Core Features

1. **Multi-Tenant Hierarchy (ltree)**: Strict isolation and impersonation capabilities across Admins, Resellers, and End Customers.
2. **High-Throughput CDR Engine**: Native PostgreSQL partitioning and deduplication designed to ingest and rate ~1B CDRs per month.
3. **Advanced Rating System**: Longest-prefix match (`PrefixTrie`), effective dates, incremental billing (e.g., 60/6), and connection fees.
4. **Double-Entry Ledger**: Accurate, immutable financial ledger tracking balances, invoices, top-ups, and taxes.
5. **Modern Stack**: Fully typed with TypeScript, Drizzle ORM for performant SQL, and Zod for strict boundary validations.

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- pnpm
- Docker & Docker Compose

### 1. Boot up the Infrastructure
Spin up PostgreSQL, Redis, and the backend services:
```bash
cd infra/docker
docker compose up -d
```
*Note: The `db-setup` container will automatically run Drizzle migrations and seed the initial Admin user.*

### 2. Start the Frontend
In a new terminal window:
```bash
pnpm install
cd apps/web
pnpm run dev
```

### 3. Login
Navigate to `http://localhost:5173`
- **Username:** `admin@platform`
- **Password:** `password123`

## 🧪 Testing
- **Unit & Integration:** `pnpm test` (Powered by Vitest)
- **Load Testing:** `k6 run tests/load/api-load.js`
- **End-to-End:** Playwright specs are located in `tests/e2e/spec/`

## 📚 Documentation
- **Architecture Decisions (ADRs):** View `docs/adr/`
- **Runbooks (DR, Ops):** View `docs/runbooks/`
- **Implementation Plan:** View `implementation_plan.md`
# ADR 007: Currency & Tax

## Status
Accepted

## Context
Financial platforms often have to handle varying levels of complexity regarding currencies and taxation based on the target market.

## Decision
We will operate on a single currency (e.g., USD) and will not support complex tax regimes or multi-currency/FX.

## Consequences
- Removes the need for real-time exchange rate tables and multi-currency ledger conversions.
- Tax logic can remain simple or non-existent in the early phases.
- If we expand to multi-currency later, significant schema migrations will be required.

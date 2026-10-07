# ADR 008: Payment Gateway

## Status
Accepted

## Context
Customers need a way to top up their prepaid balances and pay their postpaid invoices.

## Decision
We will integrate with Stripe (starting in test mode) as the primary payment gateway.

## Consequences
- Simple, standardized SDK and webhook handling.
- We will omit PayMongo and other regional gateways from the initial release scope.

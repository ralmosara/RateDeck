# ADR 006: Hosting & Deployment Strategy

## Status
Accepted

## Context
We need to define our initial hosting and deployment target for RateDeck. Given the modular monolith design, we have a variety of deployment options.

## Decision
We will deploy to a Single VPS using Docker Compose to start. 

## Consequences
- Operations are kept extremely simple in the early phases.
- Single node limitations apply; horizontal scaling will require moving to a container orchestration platform (like Kubernetes/GKE/EKS) in the future.
- The `infra/docker/docker-compose.yml` will serve as the primary deployment mechanism for production initially.

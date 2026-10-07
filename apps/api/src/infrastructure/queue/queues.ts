/**
 * Canonical queue names (ADR-0006). Each maps to a dedicated worker pool so
 * ingestion bursts never starve billing or webhooks.
 */
export const QUEUES = {
  system: 'system',
  cdrImport: 'cdr-import',
  rating: 'rating',
  billing: 'billing',
  integration: 'integration',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

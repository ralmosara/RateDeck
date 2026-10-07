import { z } from 'zod';

export const dependencyStatus = z.enum(['up', 'down']);

export const healthResponse = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  uptimeSec: z.number(),
  checks: z.object({ database: dependencyStatus, redis: dependencyStatus }),
});
export type HealthResponse = z.infer<typeof healthResponse>;

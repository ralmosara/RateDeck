import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

/** Loads the nearest .env (app dir or monorepo root) without overriding real env vars. */
function loadDotEnv(): void {
  for (const candidate of ['.env', '../../.env']) {
    const p = resolve(process.cwd(), candidate);
    if (existsSync(p)) {
      process.loadEnvFile(p);
      return;
    }
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().default(3000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  DB_POOL_MAX: z.coerce.number().int().min(1).default(20),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DEFAULT_CURRENCY: z.string().regex(/^[A-Z]{3}$/).default('USD'),
  DEFAULT_TIMEZONE: z.string().default('UTC'),
  JWT_SECRET: z.string().min(16),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Fail fast at boot on misconfiguration — never at first request. */
export function loadEnv(): Env {
  if (cached) return cached;
  loadDotEnv();
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const ENV = Symbol('ENV');

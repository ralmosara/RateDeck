import { z } from 'zod';

/** Decimal transported as string to avoid float loss (ADR-0003). */
export const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Must be a decimal string, e.g. "0.01250000"');

export const currencyCode = z.string().regex(/^[A-Z]{3}$/, 'ISO 4217 code');

export const moneySchema = z.object({ amount: decimalString, currency: currencyCode });
export type MoneyDto = z.infer<typeof moneySchema>;

export const uuid = z.string().uuid();

/** Cursor pagination (CDRs and other high-volume lists). */
export const cursorQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});
export type CursorQuery = z.infer<typeof cursorQuery>;

export const cursorPage = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ data: z.array(item), nextCursor: z.string().nullable() });

/** RFC 9457 Problem Details — the only error shape the API returns. */
export const problemDetails = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  code: z.string().optional(),
  correlationId: z.string().optional(),
  errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});
export type ProblemDetails = z.infer<typeof problemDetails>;

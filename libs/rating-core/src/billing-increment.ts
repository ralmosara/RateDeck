/**
 * Billing increment, expressed as `first/next` seconds (e.g. 60/60, 30/6, 1/1).
 *
 * BR-03:
 *   duration <= 0            → 0
 *   duration <= first        → first
 *   otherwise                → first + ceil((duration - first) / next) * next
 */
export interface BillingIncrement {
  readonly first: number;
  readonly next: number;
}

export function assertValidIncrement(inc: BillingIncrement): void {
  if (!Number.isInteger(inc.first) || inc.first < 0) {
    throw new RangeError(`increment.first must be a non-negative integer, got ${inc.first}`);
  }
  if (!Number.isInteger(inc.next) || inc.next < 1) {
    throw new RangeError(`increment.next must be a positive integer, got ${inc.next}`);
  }
}

export function billedSeconds(durationSec: number, inc: BillingIncrement): number {
  assertValidIncrement(inc);
  if (!Number.isFinite(durationSec) || durationSec <= 0) return 0;
  const duration = Math.ceil(durationSec); // fractional seconds always round up
  if (duration <= inc.first) return inc.first;
  return inc.first + roundUp(duration - inc.first, inc.next);
}

function roundUp(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

export function parseIncrement(text: string): BillingIncrement {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(text);
  if (!m) throw new SyntaxError(`Invalid billing increment "${text}", expected "first/next"`);
  const inc = { first: Number(m[1]), next: Number(m[2]) };
  assertValidIncrement(inc);
  return inc;
}

export function formatIncrement(inc: BillingIncrement): string {
  return `${inc.first}/${inc.next}`;
}

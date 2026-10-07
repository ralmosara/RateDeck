import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { billedSeconds, parseIncrement } from './billing-increment';

describe('billedSeconds (BR-03)', () => {
  it.each([
    // [duration, increment, expected]
    [0, '60/60', 0],
    [1, '60/60', 60],
    [60, '60/60', 60],
    [61, '60/60', 120],
    [1, '30/6', 30],
    [31, '30/6', 36],
    [36, '30/6', 36],
    [37, '30/6', 42],
    [1, '1/1', 1],
    [125, '1/1', 125],
    [7, '0/6', 12],
    [12.2, '1/1', 13],
  ])('duration %s with %s → %s', (duration, inc, expected) => {
    expect(billedSeconds(duration, parseIncrement(inc))).toBe(expected);
  });

  it('rejects invalid increments', () => {
    expect(() => parseIncrement('60/0')).toThrow();
    expect(() => parseIncrement('abc')).toThrow();
  });

  const incArb = fc.record({ first: fc.integer({ min: 0, max: 120 }), next: fc.integer({ min: 1, max: 60 }) });

  it('property: billed ≥ duration for any positive call', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 86_400 }), incArb, (d, inc) => billedSeconds(d, inc) >= d),
    );
  });

  it('property: overbilling is bounded by max(first, next)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 86_400 }), incArb, (d, inc) => {
        return billedSeconds(d, inc) - d < Math.max(inc.first, inc.next);
      }),
    );
  });

  it('property: monotonic in duration', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 86_400 }), fc.integer({ min: 0, max: 600 }), incArb, (d, delta, inc) => {
        return billedSeconds(d + delta, inc) >= billedSeconds(d, inc);
      }),
    );
  });
});

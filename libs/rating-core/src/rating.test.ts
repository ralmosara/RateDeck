import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { candidatePrefixes, normalizeNumber, PrefixTrie } from './prefix-trie';
import { rateCall, type Rate } from './rate-call';

const rate = (destination: string, ratePerMin: string, connectionFee = '0', first = 60, next = 60): Rate => ({
  destination,
  ratePerMin,
  connectionFee,
  increment: { first, next },
  currency: 'USD',
});

const T = (iso: string) => new Date(iso).getTime();

describe('normalizeNumber', () => {
  it.each([
    ['+63 917-123-4567', '639171234567'],
    ['0063917123', '63917123'],
    ['tel:+1 (415) 555-0100', '14155550100'],
    ['sip:+44207@carrier.example', '44207'],
    ['abc', ''],
  ])('%s → %s', (raw, expected) => expect(normalizeNumber(raw)).toBe(expected));
});

describe('candidatePrefixes', () => {
  it('returns longest first', () => {
    expect(candidatePrefixes('6391')).toEqual(['6391', '639', '63', '6']);
  });
});

describe('PrefixTrie longest-prefix match', () => {
  const trie = new PrefixTrie<Rate>();
  trie.insert('63', rate('Philippines', '0.10'));
  trie.insert('639', rate('Philippines Mobile', '0.15'));
  trie.insert('63917', rate('Philippines Mobile Globe', '0.12'));

  it('picks the longest matching prefix', () => {
    expect(trie.longestMatch('639171234567')?.prefix).toBe('63917');
    expect(trie.longestMatch('639281234567')?.prefix).toBe('639');
    expect(trie.longestMatch('6321234567')?.prefix).toBe('63');
    expect(trie.longestMatch('14155550100')).toBeNull();
  });

  it('property: result is the longest inserted prefix of the number', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.stringMatching(/^\d{1,6}$/), { minLength: 1, maxLength: 50 }),
        fc.stringMatching(/^\d{6,12}$/),
        (prefixes, number) => {
          const t = new PrefixTrie<string>();
          prefixes.forEach((p) => t.insert(p, p));
          const expected = prefixes
            .filter((p) => number.startsWith(p))
            .sort((a, b) => b.length - a.length)[0];
          return (t.longestMatch(number)?.prefix ?? undefined) === expected;
        },
      ),
    );
  });
});

describe('effective dating (BR-01, BR-02)', () => {
  it('selects the rate effective at call start, falling back to shorter prefixes', () => {
    const trie = new PrefixTrie<Rate>();
    trie.insert('44', rate('UK', '0.05'));
    trie.insert('447', rate('UK Mobile (old)', '0.20'), { from: T('2026-01-01'), to: T('2026-06-01') });
    trie.insert('447', rate('UK Mobile (new)', '0.18'), { from: T('2026-06-01'), to: null });

    expect(trie.longestMatch('447700900000', T('2026-03-15'))?.value.destination).toBe('UK Mobile (old)');
    expect(trie.longestMatch('447700900000', T('2026-06-01'))?.value.destination).toBe('UK Mobile (new)');
    expect(trie.longestMatch('447700900000', T('2025-12-31'))?.value.destination).toBe('UK');
  });

  it('rejects overlapping windows for the same prefix', () => {
    const trie = new PrefixTrie<Rate>();
    trie.insert('1', rate('US', '0.01'), { from: T('2026-01-01'), to: T('2026-03-01') });
    expect(() =>
      trie.insert('1', rate('US', '0.02'), { from: T('2026-02-01'), to: null }),
    ).toThrow(/BR-01/);
  });
});

describe('rateCall (BR-04)', () => {
  const trie = new PrefixTrie<Rate>();
  trie.insert('63917', rate('PH Globe', '0.1234', '0.0100', 30, 6));

  const call = (durationSec: number, disposition: 'ANSWERED' | 'NO_ANSWER' = 'ANSWERED') =>
    rateCall({ callee: '+639171234567', startTime: new Date('2026-10-01T00:00:00Z'), durationSec, disposition }, trie);

  it('computes connection fee + increment-billed usage at 8 dp', () => {
    const out = call(37);
    expect(out.status).toBe('rated');
    if (out.status !== 'rated') return;
    expect(out.breakdown.billedSec).toBe(42);
    // 42/60 × 0.1234 = 0.08638 ; + 0.01
    expect(out.breakdown.usageAmount.toString()).toBe('0.08638000');
    expect(out.breakdown.total.toString()).toBe('0.09638000');
  });

  it('rates unanswered calls at zero without connection fee', () => {
    const out = call(0, 'NO_ANSWER');
    expect(out.status === 'rated' && out.breakdown.total.isZero()).toBe(true);
  });

  it('flags unrateable calls', () => {
    expect(rateCall({ callee: '+999', startTime: new Date(), durationSec: 10, disposition: 'ANSWERED' }, trie)).toEqual({
      status: 'unrateable',
      reason: 'NO_MATCHING_RATE',
    });
    expect(rateCall({ callee: 'n/a', startTime: new Date(), durationSec: 10, disposition: 'ANSWERED' }, trie)).toEqual({
      status: 'unrateable',
      reason: 'INVALID_NUMBER',
    });
  });
});

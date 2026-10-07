import { describe, expect, it } from 'vitest';
import { CurrencyMismatchError, Money } from './money';

describe('Money', () => {
  it('avoids float drift (0.1 + 0.2)', () => {
    expect(Money.of('0.1', 'USD').add(Money.of('0.2', 'USD')).toString()).toBe('0.30000000');
  });

  it('keeps 8 dp internally', () => {
    expect(Money.of('0.0123456789', 'USD').toString()).toBe('0.01234568');
  });

  it('uses banker’s rounding at minor-unit finalisation', () => {
    expect(Money.of('2.345', 'USD').toMinorUnitPrecision().toString(2)).toBe('2.34');
    expect(Money.of('2.355', 'USD').toMinorUnitPrecision().toString(2)).toBe('2.36');
    expect(Money.of('100.5', 'JPY').toMinorUnitPrecision().toString(0)).toBe('100');
  });

  it('refuses cross-currency arithmetic', () => {
    expect(() => Money.of(1, 'USD').add(Money.of(1, 'PHP'))).toThrow(CurrencyMismatchError);
  });

  it('rejects invalid currency codes and non-finite amounts', () => {
    expect(() => Money.of(1, 'usd')).toThrow();
    expect(() => Money.of(Infinity, 'USD')).toThrow();
  });

  it('serialises as string amount', () => {
    expect(JSON.stringify(Money.of('1.5', 'PHP'))).toBe('{"amount":"1.50000000","currency":"PHP"}');
  });
});

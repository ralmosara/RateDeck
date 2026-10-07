import Decimal from 'decimal.js';

/**
 * Money value object.
 *
 * Invariants (ADR-0003):
 *  - Never backed by a JS float; uses arbitrary-precision decimals.
 *  - Arithmetic between different currencies is a programming error.
 *  - Internal precision is 8 dp (rated amounts); rounding to minor units
 *    happens only at invoice finalisation, using banker's rounding.
 */
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });

export const RATE_SCALE = 8;

export type CurrencyCode = string & { readonly __brand: 'CurrencyCode' };

const CURRENCY_RE = /^[A-Z]{3}$/;

/** Minor-unit exponent per ISO 4217 (extend as currencies are enabled). */
const MINOR_UNITS: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  PHP: 2,
  SGD: 2,
  AUD: 2,
  JPY: 0,
};

export function currency(code: string): CurrencyCode {
  if (!CURRENCY_RE.test(code)) {
    throw new Error(`Invalid ISO 4217 currency code: "${code}"`);
  }
  return code as CurrencyCode;
}

export class CurrencyMismatchError extends Error {
  constructor(a: string, b: string) {
    super(`Currency mismatch: ${a} vs ${b}`);
    this.name = 'CurrencyMismatchError';
  }
}

export class Money {
  private constructor(
    private readonly value: Decimal,
    readonly currency: CurrencyCode,
  ) {}

  static of(amount: Decimal.Value, code: string): Money {
    const v = new D(amount);
    if (!v.isFinite()) throw new Error(`Money amount must be finite, got ${String(amount)}`);
    return new Money(v.toDecimalPlaces(RATE_SCALE), currency(code));
  }

  static zero(code: string): Money {
    return Money.of(0, code);
  }

  add(other: Money): Money {
    this.assertSame(other);
    return new Money(this.value.plus(other.value).toDecimalPlaces(RATE_SCALE), this.currency);
  }

  subtract(other: Money): Money {
    this.assertSame(other);
    return new Money(this.value.minus(other.value).toDecimalPlaces(RATE_SCALE), this.currency);
  }

  multiply(factor: Decimal.Value): Money {
    return new Money(this.value.times(new D(factor)).toDecimalPlaces(RATE_SCALE), this.currency);
  }

  divide(divisor: Decimal.Value): Money {
    const d = new D(divisor);
    if (d.isZero()) throw new Error('Division by zero');
    return new Money(this.value.dividedBy(d).toDecimalPlaces(RATE_SCALE), this.currency);
  }

  negate(): Money {
    return new Money(this.value.negated(), this.currency);
  }

  /** Round to the currency's minor unit with banker's rounding (invoice finalisation). */
  toMinorUnitPrecision(): Money {
    const dp = MINOR_UNITS[this.currency] ?? 2;
    return new Money(this.value.toDecimalPlaces(dp, Decimal.ROUND_HALF_EVEN), this.currency);
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative() && !this.value.isZero();
  }

  compare(other: Money): -1 | 0 | 1 {
    this.assertSame(other);
    return this.value.comparedTo(other.value) as -1 | 0 | 1;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.value.equals(other.value);
  }

  /** Fixed-point string suitable for NUMERIC columns and JSON transport. */
  toString(scale: number = RATE_SCALE): string {
    return this.value.toFixed(scale);
  }

  toJSON(): { amount: string; currency: string } {
    return { amount: this.toString(), currency: this.currency };
  }

  /** Escape hatch for domain calculations needing raw decimals. */
  toDecimal(): Decimal {
    return this.value;
  }

  private assertSame(other: Money): void {
    if (other.currency !== this.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }
}

export { D as Dec };

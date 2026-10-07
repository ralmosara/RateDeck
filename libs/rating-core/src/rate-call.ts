import { Dec, Money } from '@ratedeck/shared-kernel';
import { billedSeconds, type BillingIncrement } from './billing-increment';
import { normalizeNumber, type PrefixTrie } from './prefix-trie';

export type Disposition = 'ANSWERED' | 'NO_ANSWER' | 'BUSY' | 'FAILED';

export interface Rate {
  readonly destination: string;
  /** Decimal string, per minute, in `currency`. */
  readonly ratePerMin: string;
  /** Decimal string, flat per answered call. */
  readonly connectionFee: string;
  readonly increment: BillingIncrement;
  readonly currency: string;
}

export interface CallInput {
  readonly callee: string;
  readonly startTime: Date;
  readonly durationSec: number;
  readonly disposition: Disposition;
}

export interface RatingBreakdown {
  readonly normalizedCallee: string;
  readonly matchedPrefix: string;
  readonly destination: string;
  readonly durationSec: number;
  readonly billedSec: number;
  readonly increment: BillingIncrement;
  readonly ratePerMin: Money;
  readonly usageAmount: Money;
  readonly connectionFee: Money;
  readonly total: Money;
}

export type RatingOutcome =
  | { readonly status: 'rated'; readonly breakdown: RatingBreakdown }
  | { readonly status: 'unrateable'; readonly reason: 'INVALID_NUMBER' | 'NO_MATCHING_RATE' };

/**
 * Rates a single call (BR-02, BR-03, BR-04).
 * - Rate selected by longest prefix effective at the call's start_time.
 * - Unanswered / zero-duration calls are rated at zero (still "rated", for auditability).
 * - amount = connection_fee + billed_sec × rate_per_min / 60  (8 dp)
 */
export function rateCall(call: CallInput, trie: PrefixTrie<Rate>): RatingOutcome {
  const callee = normalizeNumber(call.callee);
  if (!callee) return { status: 'unrateable', reason: 'INVALID_NUMBER' };

  const match = trie.longestMatch(callee, call.startTime.getTime());
  if (!match) return { status: 'unrateable', reason: 'NO_MATCHING_RATE' };

  const rate = match.value;
  const answered = call.disposition === 'ANSWERED' && call.durationSec > 0;
  const billedSec = answered ? billedSeconds(call.durationSec, rate.increment) : 0;

  const ratePerMin = Money.of(rate.ratePerMin, rate.currency);
  const usageAmount = ratePerMin.multiply(new Dec(billedSec).dividedBy(60));
  const connectionFee = answered ? Money.of(rate.connectionFee, rate.currency) : Money.zero(rate.currency);

  return {
    status: 'rated',
    breakdown: {
      normalizedCallee: callee,
      matchedPrefix: match.prefix,
      destination: rate.destination,
      durationSec: call.durationSec,
      billedSec,
      increment: rate.increment,
      ratePerMin,
      usageAmount,
      connectionFee,
      total: usageAmount.add(connectionFee),
    },
  };
}

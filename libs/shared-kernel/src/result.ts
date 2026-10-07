/**
 * Explicit success/failure for domain operations where failure is expected
 * (validation, business-rule violations). Exceptions remain for programmer errors.
 */
export type Result<T, E = DomainError> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export interface DomainError {
  /** Stable machine-readable code, e.g. `RATE_OVERLAP`, `BR-05_MARGIN_GUARD`. */
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export const domainError = (
  code: string,
  message: string,
  details?: Record<string, unknown>,
): DomainError => (details ? { code, message, details } : { code, message });

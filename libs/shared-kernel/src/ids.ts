/** Nominal typing helper so IDs of different aggregates can't be mixed up. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type AccountId = Brand<string, 'AccountId'>;
export type UserId = Brand<string, 'UserId'>;
export type RateDeckId = Brand<string, 'RateDeckId'>;
export type DeckVersionId = Brand<string, 'DeckVersionId'>;
export type InvoiceId = Brand<string, 'InvoiceId'>;

export type AccountType = 'platform' | 'reseller' | 'customer' | 'sub_account';

export const ACCOUNT_TYPES: readonly AccountType[] = [
  'platform',
  'reseller',
  'customer',
  'sub_account',
] as const;

/** Allowed parent → child relationships in the account hierarchy. */
export const ALLOWED_CHILDREN: Readonly<Record<AccountType, readonly AccountType[]>> = {
  platform: ['reseller', 'customer'],
  reseller: ['customer'],
  customer: ['sub_account'],
  sub_account: [],
};

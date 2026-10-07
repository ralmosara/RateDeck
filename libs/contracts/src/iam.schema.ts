import { z } from 'zod';

export const AccountTypeSchema = z.enum(['platform', 'reseller', 'customer', 'sub_account']);
export const AccountStatusSchema = z.enum(['active', 'suspended', 'closed']);
export const BillingModeSchema = z.enum(['prepaid', 'postpaid']);

export const AccountSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  type: AccountTypeSchema,
  path: z.string(),
  name: z.string().min(1).max(255),
  status: AccountStatusSchema,
  currency: z.string().length(3),
  timezone: z.string(),
  billingMode: BillingModeSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Account = z.infer<typeof AccountSchema>;

export const UserStatusSchema = z.enum(['active', 'locked', 'disabled']);

export const UserSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  accountPath: z.string(),
  email: z.string().email(),
  displayName: z.string().min(1).max(255),
  mfaEnabled: z.boolean(),
  status: UserStatusSchema,
  lastLoginAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  mfaRequired: z.boolean().optional(),
  mfaToken: z.string().optional(),
  user: UserSchema.optional(),
  account: AccountSchema.optional(),
  permissions: z.array(z.string()).optional(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const MfaVerifyRequestSchema = z.object({
  mfaToken: z.string(),
  code: z.string().length(6),
});
export type MfaVerifyRequest = z.infer<typeof MfaVerifyRequestSchema>;

export const MfaSetupResponseSchema = z.object({
  secret: z.string(),
  qrCodeUrl: z.string(),
});
export type MfaSetupResponse = z.infer<typeof MfaSetupResponseSchema>;

export const MfaEnableRequestSchema = z.object({
  code: z.string().length(6),
});
export type MfaEnableRequest = z.infer<typeof MfaEnableRequestSchema>;


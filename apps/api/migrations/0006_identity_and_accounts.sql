-- 0006_identity_and_accounts.sql

CREATE TABLE "api_tokens" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"account_id" bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"permissions" jsonb,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_tokens_token_hash_unique" UNIQUE("token_hash")
);

CREATE TABLE "impersonation_sessions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"admin_user_id" bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	"target_user_id" bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "impersonation_sessions_token_hash_unique" UNIQUE("token_hash")
);

CREATE TABLE "mfa_factors" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"user_id" bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	"type" text NOT NULL,
	"secret" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "sessions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"user_id" bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	"token_hash" text NOT NULL,
	"ip" text,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);

-- RLS Enforcement
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON api_tokens 
  USING ((SELECT path FROM accounts WHERE accounts.id = api_tokens.account_id) <@ app_scope()) 
  WITH CHECK ((SELECT path FROM accounts WHERE accounts.id = api_tokens.account_id) <@ app_scope());

CREATE POLICY tenant_scope ON impersonation_sessions 
  USING ((SELECT account_path FROM users WHERE users.id = impersonation_sessions.target_user_id) <@ app_scope()) 
  WITH CHECK ((SELECT account_path FROM users WHERE users.id = impersonation_sessions.target_user_id) <@ app_scope());

CREATE POLICY tenant_scope ON mfa_factors 
  USING ((SELECT account_path FROM users WHERE users.id = mfa_factors.user_id) <@ app_scope()) 
  WITH CHECK ((SELECT account_path FROM users WHERE users.id = mfa_factors.user_id) <@ app_scope());

CREATE POLICY tenant_scope ON sessions 
  USING ((SELECT account_path FROM users WHERE users.id = sessions.user_id) <@ app_scope()) 
  WITH CHECK ((SELECT account_path FROM users WHERE users.id = sessions.user_id) <@ app_scope());

-- Grant access to runtime role
GRANT SELECT, INSERT, UPDATE, DELETE ON api_tokens, impersonation_sessions, mfa_factors, sessions TO ratedeck_app;

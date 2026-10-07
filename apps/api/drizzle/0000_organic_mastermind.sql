CREATE TABLE "accounts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" bigint,
	"type" text NOT NULL,
	"path" "ltree" NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"currency" char(3) NOT NULL,
	"timezone" text NOT NULL,
	"billing_mode" text DEFAULT 'prepaid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigint GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_path" "ltree" NOT NULL,
	"actor_user_id" bigint,
	"effective_user_id" bigint,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"ip" text,
	"user_agent" text,
	"correlation_id" text,
	"changes" jsonb,
	CONSTRAINT "audit_log_occurred_at_id_pk" PRIMARY KEY("occurred_at","id")
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "outbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" bigint NOT NULL,
	"permission_key" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_key_pk" PRIMARY KEY("role_id","permission_key")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"key" text NOT NULL,
	"name" text NOT NULL,
	"built_in" boolean DEFAULT false NOT NULL,
	CONSTRAINT "roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" bigint NOT NULL,
	"role_id" bigint NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"email" "citext" NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "markup_rules" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "markup_rules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"deck_id" bigint NOT NULL,
	"prefix_match" text NOT NULL,
	"markup_percentage" numeric(10, 4) DEFAULT '0' NOT NULL,
	"fixed_addition" numeric(20, 8) DEFAULT '0' NOT NULL,
	"override_rate" numeric(20, 8)
);
--> statement-breakpoint
CREATE TABLE "rate_deck_versions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rate_deck_versions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"effective" "tstzrange" NOT NULL,
	"source_file_sha256" text,
	"published_by" bigint,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_deck_versions_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "rate_deck_versions_deck_id_version_unique" UNIQUE("deck_id","version")
);
--> statement-breakpoint
CREATE TABLE "rate_decks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rate_decks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"kind" text NOT NULL,
	"parent_deck_id" bigint,
	"currency" char(3) NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_decks_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "rates" (
	"id" bigint GENERATED ALWAYS AS IDENTITY (sequence name "rates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"deck_version_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"prefix" text NOT NULL,
	"destination" text NOT NULL,
	"rate_per_min" numeric(20, 8) NOT NULL,
	"connection_fee" numeric(20, 8) DEFAULT '0' NOT NULL,
	"increment_first" smallint DEFAULT 60 NOT NULL,
	"increment_next" smallint DEFAULT 60 NOT NULL,
	"effective" "tstzrange" NOT NULL,
	CONSTRAINT "rates_deck_version_id_id_pk" PRIMARY KEY("deck_version_id","id")
);
--> statement-breakpoint
CREATE TABLE "carriers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "carriers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carriers_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "trunks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trunks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"carrier_id" bigint,
	"account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"name" text NOT NULL,
	"direction" text NOT NULL,
	"host" text NOT NULL,
	"auth_username" text,
	"auth_password" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trunks_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "cdr_imports" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cdr_imports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"source_file_sha256" text NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cdr_imports_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "cdrs" (
	"id" bigint GENERATED ALWAYS AS IDENTITY (sequence name "cdrs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"start_time" timestamp with time zone NOT NULL,
	"account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"source_id" smallint NOT NULL,
	"external_call_id" text NOT NULL,
	"caller" text,
	"callee" text NOT NULL,
	"duration_sec" integer NOT NULL,
	"disposition" text NOT NULL,
	"trunk_id" bigint,
	"rating_status" smallint DEFAULT 0 NOT NULL,
	"matched_prefix" text,
	"billed_sec" integer,
	"cost_amount" numeric(20, 8),
	"sell_amount" numeric(20, 8),
	"reseller_sell_amount" numeric(20, 8),
	"rated_deck_version_id" bigint,
	"rating_run_id" bigint,
	"invoice_id" bigint,
	CONSTRAINT "cdrs_start_time_id_pk" PRIMARY KEY("start_time","id"),
	CONSTRAINT "cdrs_start_time_source_id_external_call_id_unique" UNIQUE("start_time","source_id","external_call_id")
);
--> statement-breakpoint
CREATE TABLE "usage_daily_summary" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "usage_daily_summary_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"day" timestamp with time zone NOT NULL,
	"destination" text NOT NULL,
	"deck_version_id" bigint NOT NULL,
	"total_calls" integer DEFAULT 0 NOT NULL,
	"total_duration_sec" integer DEFAULT 0 NOT NULL,
	"total_billed_sec" integer DEFAULT 0 NOT NULL,
	"total_cost_amount" numeric(20, 8) DEFAULT '0' NOT NULL,
	"total_sell_amount" numeric(20, 8) DEFAULT '0' NOT NULL,
	CONSTRAINT "usage_daily_summary_account_id_day_destination_deck_version_id_unique" UNIQUE("account_id","day","destination","deck_version_id")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"invoice_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"subtotal" numeric(20, 8) DEFAULT '0' NOT NULL,
	"taxes" numeric(20, 8) DEFAULT '0' NOT NULL,
	"total" numeric(20, 8) DEFAULT '0' NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"pdf_url" text,
	"stripe_invoice_id" text,
	"issued_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "ledger_transactions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ledger_transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_transactions_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "webhook_deliveries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"endpoint_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"event_type" text NOT NULL,
	"payload" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"status_code" bigint,
	"response_body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	CONSTRAINT "webhook_deliveries_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "webhook_endpoints_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"events" text DEFAULT '*' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_endpoints_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ticket_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"ticket_id" bigint NOT NULL,
	"author_id" bigint NOT NULL,
	"body" text NOT NULL,
	"is_internal_note" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tickets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"created_by" bigint NOT NULL,
	"assigned_to" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "markup_rules" ADD CONSTRAINT "markup_rules_deck_id_rate_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."rate_decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_deck_versions" ADD CONSTRAINT "rate_deck_versions_deck_id_rate_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."rate_decks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_deck_versions" ADD CONSTRAINT "rate_deck_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_decks" ADD CONSTRAINT "rate_decks_owner_account_id_accounts_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rates" ADD CONSTRAINT "rates_deck_version_id_rate_deck_versions_id_fk" FOREIGN KEY ("deck_version_id") REFERENCES "public"."rate_deck_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carriers" ADD CONSTRAINT "carriers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trunks" ADD CONSTRAINT "trunks_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trunks" ADD CONSTRAINT "trunks_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdr_imports" ADD CONSTRAINT "cdr_imports_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdrs" ADD CONSTRAINT "cdrs_trunk_id_trunks_id_fk" FOREIGN KEY ("trunk_id") REFERENCES "public"."trunks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdrs" ADD CONSTRAINT "cdrs_rated_deck_version_id_rate_deck_versions_id_fk" FOREIGN KEY ("rated_deck_version_id") REFERENCES "public"."rate_deck_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_parent_idx" ON "accounts" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "rates_prefix_idx" ON "rates" USING btree ("deck_version_id","prefix");--> statement-breakpoint
CREATE INDEX "cdrs_unrated_idx" ON "cdrs" USING btree ("rating_status") WHERE rating_status = 0;--> statement-breakpoint
CREATE INDEX "ledger_tx_account_idx" ON "ledger_transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "webhook_delivery_endpoint_idx" ON "webhook_deliveries" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "webhook_delivery_status_idx" ON "webhook_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_account_idx" ON "tickets" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");
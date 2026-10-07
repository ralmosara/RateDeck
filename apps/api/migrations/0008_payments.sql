CREATE TABLE "payments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"receipt_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "payments_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "refunds_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"provider_refund_id" text,
	"amount" numeric(18, 2) NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "refunds_provider_refund_id_unique" UNIQUE("provider_refund_id")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_account_idx" ON "payments" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "refund_payment_idx" ON "refunds" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "refund_account_idx" ON "refunds" USING btree ("account_id");

-- RLS
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_iso ON "payments" FOR ALL TO ratedeck_app USING (account_path <@ app_scope());

ALTER TABLE "refunds" ENABLE ROW LEVEL SECURITY;
CREATE POLICY refunds_iso ON "refunds" FOR ALL TO ratedeck_app USING (account_path <@ app_scope());
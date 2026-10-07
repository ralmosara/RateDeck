CREATE TABLE "did_assignments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "did_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"did_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"account_path" "ltree" NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unassigned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dids" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dids_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"country_code" char(2) NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"monthly_cost" numeric(18, 2) DEFAULT '0' NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dids_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "dids_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "did_assignments" ADD CONSTRAINT "did_assignments_did_id_dids_id_fk" FOREIGN KEY ("did_id") REFERENCES "public"."dids"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "did_assignments" ADD CONSTRAINT "did_assignments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "did_assignment_account_idx" ON "did_assignments" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "did_assignment_did_idx" ON "did_assignments" USING btree ("did_id");

-- RLS
ALTER TABLE "did_assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY did_assignments_iso ON "did_assignments" FOR ALL TO ratedeck_app USING (account_path <@ app_scope());
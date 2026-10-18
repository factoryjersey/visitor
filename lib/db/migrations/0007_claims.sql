CREATE TABLE IF NOT EXISTS "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text,
	"listing_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"business_name" text NOT NULL,
	"relationship" text,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"business_id" uuid,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_status" ON "claims" USING btree ("status","created_at");--> statement-breakpoint
-- As every table: closed to Supabase's REST API; the app reads it over its own connection.
ALTER TABLE "claims" ENABLE ROW LEVEL SECURITY;

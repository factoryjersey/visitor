CREATE TABLE IF NOT EXISTS "organiser_profiles" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"fallback_image" jsonb,
	"edited_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "fallback_image" jsonb;--> statement-breakpoint
-- Server-side only, like every other table (0006_enable_rls).
ALTER TABLE "organiser_profiles" ENABLE ROW LEVEL SECURITY;

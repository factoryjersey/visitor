CREATE TABLE IF NOT EXISTS "do_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"side" text NOT NULL,
	"blurb" text,
	"image" jsonb,
	"position" integer DEFAULT 0 NOT NULL,
	"included" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "do_activities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "activity_code" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "activities" text[] DEFAULT '{}' NOT NULL;
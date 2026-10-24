ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "google_place_id" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "google_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "google_locked" boolean DEFAULT false NOT NULL;
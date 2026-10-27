ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "visitor_map" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "space_by_edition" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "visitor_map" text;
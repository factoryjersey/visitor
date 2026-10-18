ALTER TABLE "events" ADD COLUMN "inclusion_set_by" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "inclusion_set_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "edited_by" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "inclusion_set_by" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "inclusion_set_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "edited_by" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "edited_at" timestamp with time zone;
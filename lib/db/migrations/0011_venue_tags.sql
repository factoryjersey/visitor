ALTER TABLE "places" ADD COLUMN "recommended_in" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "client" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "client_note" text;
ALTER TABLE "events" ADD COLUMN "venue_name" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "address_line_1" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "parish" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "postcode" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "event_types" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "free" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "print_dates" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "print_times" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "print_price" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "guide_section" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "guide_area" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "guide_label" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "listing_size" text DEFAULT 'listing' NOT NULL;
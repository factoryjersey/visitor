CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"description" text,
	"guide_copy" text,
	"venue" text,
	"place_id" uuid,
	"lat" double precision,
	"lon" double precision,
	"dates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"from_price_pence" integer,
	"to_price_pence" integer,
	"header_image" jsonb,
	"source_link" text,
	"inclusion" text DEFAULT 'candidate' NOT NULL,
	"inclusion_note" text,
	"field_sources" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"locked_fields" text[] DEFAULT '{}' NOT NULL,
	"source_modified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"address_line_1" text,
	"address_line_2" text,
	"postcode" text,
	"parish" text,
	"lat" double precision,
	"lon" double precision,
	"phone" text,
	"website" text,
	"email" text,
	"summary" text,
	"description" text,
	"guide_copy" text,
	"facilities" text[] DEFAULT '{}' NOT NULL,
	"accessibility" text[] DEFAULT '{}' NOT NULL,
	"open_months" integer[] DEFAULT '{}' NOT NULL,
	"low_rate_pence" integer,
	"high_rate_pence" integer,
	"aa_rating" text,
	"header_image" jsonb,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_link" text,
	"inclusion" text DEFAULT 'candidate' NOT NULL,
	"inclusion_note" text,
	"uprn" text,
	"factoryos_contact_id" text,
	"field_sources" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"locked_fields" text[] DEFAULT '{}' NOT NULL,
	"source_modified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "places_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "source_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"external_type" text NOT NULL,
	"external_id" text NOT NULL,
	"place_id" uuid,
	"event_id" uuid,
	"payload" jsonb NOT NULL,
	"modified_at" timestamp with time zone,
	"portal_synced_at" timestamp with time zone,
	"present" boolean DEFAULT true NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "source_records" ADD CONSTRAINT "source_records_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "source_records" ADD CONSTRAINT "source_records_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "source_records_source_key" ON "source_records" USING btree ("source","external_type","external_id");
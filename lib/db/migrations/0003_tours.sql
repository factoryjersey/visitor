CREATE TABLE IF NOT EXISTS "experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"provider_id" uuid,
	"summary" text,
	"description" text,
	"guide_copy" text,
	"duration" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"genre" text,
	"dates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"occurrence" text DEFAULT 'ongoing' NOT NULL,
	"from_price_pence" integer,
	"to_price_pence" integer,
	"meeting_point" text,
	"parish" text,
	"phone" text,
	"email" text,
	"website" text,
	"lat" double precision,
	"lon" double precision,
	"print_dates" text,
	"print_times" text,
	"header_image" jsonb,
	"source_link" text,
	"inclusion" text DEFAULT 'candidate' NOT NULL,
	"inclusion_note" text,
	"inclusion_set_by" text,
	"inclusion_set_at" timestamp with time zone,
	"edited_by" text,
	"edited_at" timestamp with time zone,
	"field_sources" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"locked_fields" text[] DEFAULT '{}' NOT NULL,
	"source_modified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "experiences_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"phone" text,
	"email" text,
	"website" text,
	"place_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "providers_name_unique" UNIQUE("name"),
	CONSTRAINT "providers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "occurrence" text DEFAULT 'one-off' NOT NULL;--> statement-breakpoint
ALTER TABLE "source_records" ADD COLUMN "experience_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "experiences" ADD CONSTRAINT "experiences_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "providers" ADD CONSTRAINT "providers_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "source_records" ADD CONSTRAINT "source_records_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

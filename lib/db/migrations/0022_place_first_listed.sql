-- Empty for the venues there are: each gets the day Visit Jersey first published it, below. Only venues added from now on default to the day they are.
ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "first_listed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "places" p SET "first_listed_at" = s.first
FROM (
  SELECT "place_id", min(("payload"->>'date_gmt')::timestamp AT TIME ZONE 'UTC') AS first
  FROM "source_records"
  WHERE "source" = 'visit_jersey' AND "place_id" IS NOT NULL AND "payload"->>'date_gmt' IS NOT NULL
  GROUP BY "place_id"
) s
WHERE p."id" = s."place_id" AND p."first_listed_at" IS NULL;--> statement-breakpoint
-- Added by us, not imported: new from the day we added it.
UPDATE "places" SET "first_listed_at" = "created_at" WHERE "slug" = 'jersey-gaming-hub' AND "first_listed_at" IS NULL;--> statement-breakpoint
ALTER TABLE "places" ALTER COLUMN "first_listed_at" SET DEFAULT now();

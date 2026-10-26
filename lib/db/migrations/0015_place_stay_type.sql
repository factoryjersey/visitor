ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "stay_type" text;--> statement-breakpoint
-- What Visit Jersey already told us about each place to stay, until the next import keeps it up to date.
UPDATE "places" p SET "stay_type" = s."payload"->'acf'->'type'->0->>'label'
FROM "source_records" s
WHERE s."place_id" = p."id" AND s."source" = 'visit_jersey' AND s."external_type" = 'accommodation'
  AND jsonb_typeof(s."payload"->'acf'->'type') = 'array';

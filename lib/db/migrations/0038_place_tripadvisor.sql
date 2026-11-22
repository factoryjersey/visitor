ALTER TABLE "places" ADD COLUMN "tripadvisor_id" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "tripadvisor" jsonb;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "tripadvisor_checked_at" timestamp with time zone;--> statement-breakpoint
UPDATE "places" p SET "tripadvisor_id" = v.id FROM (
  SELECT DISTINCT ON (s."place_id") s."place_id", ltrim(s."payload"->'acf'->>'tripadvisor', '0') AS id
  FROM "source_records" s
  WHERE s."source" = 'visit_jersey' AND s."place_id" IS NOT NULL AND s."payload"->'acf'->>'tripadvisor' ~ '^[0-9]+$'
  ORDER BY s."place_id", s."fetched_at" DESC
) v WHERE p."id" = v."place_id" AND length(v.id) >= 4;

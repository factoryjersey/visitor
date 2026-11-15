ALTER TABLE "places" ADD COLUMN "bus_routes" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "access_note" text;--> statement-breakpoint
-- Filled at once from the jersey.com records we hold; the daily import keeps them up to date from here.
UPDATE "places" p SET "bus_routes" = r.routes
FROM (
  SELECT sr.place_id, array_agg(regexp_replace(trim(b->>'value'), '^x', 'X') ORDER BY o) AS routes
  FROM "source_records" sr, jsonb_array_elements(sr.payload->'acf'->'bus_routes') WITH ORDINALITY AS t(b, o)
  WHERE sr.source = 'visit_jersey' AND sr.place_id IS NOT NULL AND jsonb_typeof(sr.payload->'acf'->'bus_routes') = 'array' AND coalesce(trim(b->>'value'), '') <> ''
  GROUP BY sr.place_id
) r
WHERE p.id = r.place_id;--> statement-breakpoint
UPDATE "places" p SET "access_note" = nullif(trim(regexp_replace(replace(replace(replace(regexp_replace(sr.payload->'acf'->>'accessibility_additional_info', '<[^>]+>', ' ', 'g'), '&#8217;', '’'), '&amp;', '&'), '&nbsp;', ' '), '\s+', ' ', 'g')), '')
FROM "source_records" sr
WHERE sr.place_id = p.id AND sr.source = 'visit_jersey' AND coalesce(sr.payload->'acf'->>'accessibility_additional_info', '') <> '';

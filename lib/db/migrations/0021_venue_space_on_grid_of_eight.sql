-- The venue grid is eight boxes: what was called two-thirds took four of them, a half.
UPDATE "places" SET "listing_size" = 'half' WHERE "listing_size" = 'two-thirds';--> statement-breakpoint
UPDATE "places" SET "space_by_edition" = (
  SELECT coalesce(jsonb_object_agg(k, CASE WHEN v = '"two-thirds"'::jsonb THEN '"half"'::jsonb ELSE v END), '{}'::jsonb)
  FROM jsonb_each("space_by_edition") AS e(k, v)
) WHERE "space_by_edition"::text LIKE '%two-thirds%';

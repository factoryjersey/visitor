ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "opening_hours" jsonb;--> statement-breakpoint
-- Fill from the Visit Jersey listings already held, as the import will from now on: each day it
-- opens, its opening and closing time; nothing when the listing hides its hours.
UPDATE "places" p SET "opening_hours" = h.hours
FROM (
  SELECT DISTINCT ON (s.place_id) s.place_id, (
    SELECT jsonb_object_agg(left(d.key, 3), jsonb_build_array(lpad(d.value->>'opens', 5, '0'), lpad(d.value->>'closes', 5, '0')))
    FROM jsonb_each(s.payload->'acf'->'opening_hours') d
    WHERE d.value->>'is_open' = '1' AND coalesce(d.value->>'opens', '') ~ '^\d{1,2}:\d{2}$' AND coalesce(d.value->>'closes', '') ~ '^\d{1,2}:\d{2}$'
  ) AS hours
  FROM "source_records" s
  WHERE s.place_id IS NOT NULL AND jsonb_typeof(s.payload->'acf'->'opening_hours') = 'object'
    AND coalesce(s.payload->'acf'->>'hide_opening_hours', 'false') NOT IN ('true', '1')
  ORDER BY s.place_id, s.fetched_at DESC
) h
WHERE p.id = h.place_id AND p.opening_hours IS NULL AND h.hours IS NOT NULL;

ALTER TABLE "events" ADD COLUMN "organiser" text;--> statement-breakpoint
-- Who puts each imported event on, from what the sources already gave us:
-- Eventbrite's organiser, and the charity named on the diary's page.
UPDATE "events" e SET "organiser" = s.organiser
FROM (
  SELECT DISTINCT ON (event_id) event_id,
    nullif(trim(coalesce(payload->'page'->'organizer'->>'name', payload->'listing'->'organizer'->>'name', payload->'page'->>'charity')), '') AS organiser
  FROM "source_records"
  WHERE external_type = 'events' AND event_id IS NOT NULL AND source IN ('eventbrite', 'jersey-charities')
  ORDER BY event_id, fetched_at DESC
) s
WHERE e.id = s.event_id AND e.organiser IS NULL AND s.organiser IS NOT NULL;

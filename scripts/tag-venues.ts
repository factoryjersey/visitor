/**
 * Tags venues from a list of names, one per line:
 *
 *   pnpm tag:venues --recommended "Autumn 2026" --file featured.txt   visitor recommended, shown on the site
 *   pnpm tag:venues --client --file clients.txt                       clients, admin only
 *
 * Shows what it would do; --apply writes it. Names it cannot match to
 * one venue are listed for a person to tag by hand on the venue's admin
 * page. Never untags: a venue in last edition's list stays tagged with
 * that edition until someone changes it.
 */
import '@/lib/load-env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { inArray } from 'drizzle-orm';
import { client, db } from '@/lib/db';
import { places } from '@/lib/db/schema';
import { matchVenueNames } from '@/lib/domain/venue-tags';

const { values } = parseArgs({
  options: { file: { type: 'string' }, recommended: { type: 'string' }, client: { type: 'boolean' }, apply: { type: 'boolean' } },
});
if (!values.file || (!values.recommended && !values.client)) {
  console.error('Usage: tag:venues --file <names.txt> (--recommended "<edition>" | --client) [--apply]');
  process.exit(1);
}

const names = readFileSync(values.file, 'utf8').split(/\r?\n/);
const venues = await db.select({ id: places.id, name: places.name }).from(places);
const { matched, unmatched, ambiguous } = matchVenueNames(names, venues);

for (const m of matched) console.log(`✓ ${m.name}${m.name === m.venue.name ? '' : `  →  ${m.venue.name}`}`);
for (const a of ambiguous) console.log(`? ${a.name}  →  one of: ${a.venues.map((v) => v.name).join(' | ')}`);
for (const u of unmatched) console.log(`✗ ${u}`);
console.log(`\n${matched.length} matched, ${ambiguous.length} ambiguous, ${unmatched.length} not found`);

if (values.apply && matched.length) {
  const ids = [...new Set(matched.map((m) => m.venue.id))];
  const now = new Date();
  await db
    .update(places)
    .set({ ...(values.recommended ? { recommendedIn: values.recommended } : {}), ...(values.client ? { client: true } : {}), editedBy: 'tag:venues', editedAt: now, updatedAt: now })
    .where(inArray(places.id, ids));
  console.log(`Tagged ${ids.length} venues.`);
} else if (!values.apply) {
  console.log('Nothing written: run again with --apply.');
}
await client.end();

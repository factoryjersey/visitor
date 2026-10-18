/**
 * Give providers last edition's codes. Run after an import:
 *
 *   pnpm seed:provider-codes
 *
 * Only fills empty codes, so a code changed by hand stays. Prints who
 * matched, which codes found nobody, and which providers still have none.
 */
import '@/lib/load-env';
import { readFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { client, db } from '@/lib/db';
import { providers } from '@/lib/db/schema';
import { matchCodes } from '@/lib/domain/provider-codes';

const seed = JSON.parse(readFileSync('data/provider-codes-2026-3.json', 'utf8')) as {
  providers: { code: string; name: string; website: string | null }[];
};
const all = await db.select().from(providers);
const { assigned, unmatched } = matchCodes(seed.providers, all);

for (const [id, code] of assigned) {
  await db.update(providers).set({ code, updatedAt: new Date() }).where(eq(providers.id, id));
  console.log(`${code.padEnd(5)} ${all.find((p) => p.id === id)!.name}`);
}
console.log(`\n${assigned.size} codes given.`);
if (unmatched.length) console.log(`No provider this time for: ${unmatched.map((s) => `${s.code} ${s.name}`).join(', ')}`);
const without = all.filter((p) => !p.code && !assigned.has(p.id));
if (without.length) console.log(`Still without a code: ${without.map((p) => p.name).join(', ')}`);
await client.end();

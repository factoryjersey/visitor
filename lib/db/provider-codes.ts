import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { providers } from '@/lib/db/schema';
import { fillCodes } from '@/lib/domain/provider-code';
import { codesInUse } from './key-codes';

/**
 * A key code for every provider that has none, saved so it stays the
 * same from one edition to the next. Staff can change any of them on the
 * providers page; a code once set is never replaced here.
 */
export async function fillProviderCodes(): Promise<number> {
  const all = await db.select({ id: providers.id, name: providers.name, code: providers.code, placeId: providers.placeId }).from(providers);
  // Not a marker a Do provider has: another business's would clash in the key (lib/db/key-codes.ts).
  const doCodes = (await codesInUse()).filter((c) => !c.providerId && !all.some((p) => p.placeId && p.placeId === c.placeId)).map((c) => c.code);
  const codes = fillCodes(all, doCodes);
  for (const [id, code] of codes) await db.update(providers).set({ code, updatedAt: new Date() }).where(eq(providers.id, id));
  return codes.size;
}

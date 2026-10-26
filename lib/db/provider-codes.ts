import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { providers } from '@/lib/db/schema';
import { fillCodes } from '@/lib/domain/provider-code';

/**
 * A key code for every provider that has none, saved so it stays the
 * same from one edition to the next. Staff can change any of them on the
 * providers page; a code once set is never replaced here.
 */
export async function fillProviderCodes(): Promise<number> {
  const all = await db.select({ id: providers.id, name: providers.name, code: providers.code }).from(providers);
  const codes = fillCodes(all);
  for (const [id, code] of codes) await db.update(providers).set({ code, updatedAt: new Date() }).where(eq(providers.id, id));
  return codes.size;
}

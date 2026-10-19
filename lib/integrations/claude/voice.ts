import { createHash } from 'node:crypto';
import type { ListingKind } from '@/lib/db/schema';
import { rewriteListing, type Rewrite } from './rewrite';

/**
 * Many listings into the guide's voice, a few at a time, with what was
 * done before kept: a listing goes to Claude only when its words change.
 * One that fails keeps its own words and is tried again next run.
 */

export type KeptRewrite = Rewrite & { key: string };
export type Wordy = { id: string; kind: ListingKind; name: string; summary: string | null; description: string | null };

export const wordsKey = (w: Pick<Wordy, 'name' | 'summary' | 'description'>) =>
  createHash('sha1').update([w.name, w.summary ?? '', w.description ?? ''].join('\u0000')).digest('hex');

export async function inGuideVoice(items: Wordy[], kept: Map<string, KeptRewrite>, label: string): Promise<{ rewrites: Map<string, KeptRewrite>; fresh: number }> {
  const rewrites = new Map<string, KeptRewrite>();
  const todo: Wordy[] = [];
  for (const i of items) {
    const old = kept.get(i.id);
    if (old?.key === wordsKey(i)) rewrites.set(i.id, old);
    else if (i.summary || i.description) todo.push(i);
  }
  let fresh = 0;
  for (let n = 0; n < todo.length; n += 4) {
    await Promise.all(
      todo.slice(n, n + 4).map(async (i) => {
        const r = await rewriteListing({ kind: i.kind, name: i.name, summary: i.summary, description: i.description });
        if (r) {
          rewrites.set(i.id, { ...r, key: wordsKey(i) });
          fresh += 1;
        }
      }),
    );
    process.stdout.write(`\r${label}: rewording ${Math.min(n + 4, todo.length)} of ${todo.length}   `);
  }
  return { rewrites, fresh };
}

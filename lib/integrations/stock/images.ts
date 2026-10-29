import { createHash } from 'node:crypto';
import type { Image } from '@/lib/db/schema';
import type { Genre } from '@/lib/domain/genre';

/**
 * A picture for a listing that came without one, so no card is a grey
 * box. From royalty-free libraries only: Pexels (free for any use, no
 * attribution required) when PEXELS_API_KEY is set, otherwise Openverse's
 * public-domain and CC0 photographs, which need no key. Either way the
 * photographer is kept and credited on the page.
 *
 * The search is by what the listing is: a Bulls match gets football, a
 * Jersey RFC one rugby, a concert live music. Which of the results it
 * gets is fixed by its id, so a page keeps its picture and neighbouring
 * cards rarely share one.
 */

type Listing = { id: string; title: string; organiser?: string | null; eventTypes?: readonly string[]; genre?: Genre | null };

/** The first that matches wins: the most telling kinds before the broad ones. */
const BY_KIND: [string, string][] = [
  ['Festivals', 'festival crowd summer'],
  ['Music', 'live music concert stage'],
  ['Markets & fairs', 'outdoor market stalls'],
  ['Food & drink', 'restaurant food table'],
  ['Arts & cultural', 'theatre stage performance'],
  ['History & Heritage', 'castle ruins coast'],
  ['Talks & learning', 'audience lecture hall'],
  ['Health & wellbeing', 'yoga class outdoors'],
  ['Nightlife', 'cocktail bar night'],
  ['Charity', 'community volunteers event'],
  ['Family friendly', 'family day out children'],
  ['Seasonal', 'christmas lights market'],
  ['Outdoor', 'coastal path walk sea'],
  ['Sports', 'sports crowd stadium'],
];

const BY_GENRE: Record<Genre, string> = {
  'On foot': 'guided walking tour coast',
  Active: 'kayaking sea coast',
  'On the water': 'boat trip sea',
  Motorised: 'island coach tour',
  Foodie: 'seafood oysters',
  'Classes & crafts': 'pottery workshop hands',
};

export function stockQuery(l: Listing): string {
  const words = `${l.title} ${l.organiser ?? ''}`.toLowerCase();
  if (/\bbulls\b|football|\bfc\b/.test(words)) return 'football match stadium';
  if (/\brfc\b|rugby/.test(words)) return 'rugby match';
  if (/golf/.test(words)) return 'golf course';
  if (/marathon|\brun\b|race/.test(words)) return 'running race';
  if (l.genre) return BY_GENRE[l.genre];
  const types = l.eventTypes ?? [];
  return BY_KIND.find(([t]) => types.includes(t))?.[1] ?? 'jersey channel islands coast';
}

export type StockPhoto = { url: string; alt: string | null; credit: { name: string; url: string | null; source: string } };

const UA = 'VisitorGuideJersey/1.0 (+https://guide.je)';

async function fromPexels(query: string, key: string): Promise<StockPhoto[]> {
  const res = await fetch(`https://api.pexels.com/v1/search?${new URLSearchParams({ query, orientation: 'landscape', per_page: '30' })}`, {
    headers: { authorization: key, 'user-agent': UA },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`Pexels ${res.status}`);
  const body = (await res.json()) as { photos?: { src: { landscape: string; large2x?: string }; alt?: string; photographer: string; photographer_url?: string }[] };
  return (body.photos ?? []).map((p) => ({ url: p.src.large2x ?? p.src.landscape, alt: p.alt || null, credit: { name: p.photographer, url: p.photographer_url ?? null, source: 'Pexels' } }));
}

async function fromOpenverse(query: string): Promise<StockPhoto[]> {
  const params = new URLSearchParams({ q: query, license: 'cc0,pdm', category: 'photograph', aspect_ratio: 'wide', size: 'large', page_size: '20', mature: 'false' });
  const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(45_000) });
  if (!res.ok) throw new Error(`Openverse ${res.status}`);
  const body = (await res.json()) as { results?: { url: string; thumbnail?: string; title?: string; creator?: string; creator_url?: string; foreign_landing_url?: string }[] };
  // Openverse's own resized copy: an original can run to many megabytes.
  return (body.results ?? [])
    .filter((r) => /^https:\/\//.test(r.url))
    .map((r) => ({ url: r.thumbnail ?? r.url, alt: r.title ?? null, credit: { name: r.creator || 'Unknown', url: r.creator_url ?? r.foreign_landing_url ?? null, source: 'Openverse' } }));
}

/** Openverse without a key is slow and rations requests: a second try after a pause, then give up until tomorrow. */
async function retryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((r) => setTimeout(r, 10_000));
    return fn();
  }
}

/** Searches cached for the run: one request per kind of picture, not per listing. */
export function stockLibrary(pexelsKey?: string) {
  const pools = new Map<string, Promise<StockPhoto[]>>();
  const pool = (query: string) => {
    if (!pools.has(query)) {
      pools.set(
        query,
        retryOnce(() => (pexelsKey ? fromPexels(query, pexelsKey) : fromOpenverse(query))).catch((e) => {
          console.warn(`stock pictures for "${query}": ${(e as Error).message}`);
          return [];
        }),
      );
    }
    return pools.get(query)!;
  };
  return {
    source: pexelsKey ? 'Pexels' : 'Openverse',
    async pick(l: Listing): Promise<Image | null> {
      const query = stockQuery(l);
      const photos = await pool(query);
      if (!photos.length) return null;
      const n = parseInt(createHash('sha1').update(l.id).digest('hex').slice(0, 8), 16);
      const p = photos[n % photos.length]!;
      return { url: p.url, publicId: null, alt: p.alt, originalFilename: null, credit: p.credit };
    },
  };
}

import { publicSearch } from '@/lib/db/public';
import { hiddenByDefault, siteTypes } from '@/lib/domain/categorise';
import { printPrice } from '@/lib/domain/house-style';
import { UNIQUE } from '@/lib/domain/occurrence';
import { KINDS, fit, kindCounts, parishFrom, searchWords, sortHits, type Hit, type Kind } from '@/lib/domain/search';
import { tourKind } from '@/lib/domain/tour-kind';
import { cardWhen } from '@/lib/domain/web-dates';
import { jerseyToday, rangeLabel, resolveWhen, type WhenPick } from '@/lib/domain/when';
import { cardLocation } from '@/components/site/listing-card';
import { CATEGORY_LABEL } from '@/lib/params';

export type SearchAsk = { q?: string; kind?: Kind; when?: string; from?: string; to?: string; cats?: string[] };

export type SearchAnswer = {
  /** Something asked: words, a day or a category. Without, there is nothing to list yet, only counts. */
  asked: boolean;
  range: { from: string; to: string; pick: WhenPick | 'dates'; label: string } | null;
  /** How many of each kind, in the categories chosen. */
  counts: Record<Kind | 'all', number>;
  /** How many in each category (an event's kinds, a tour's genre), of the kind chosen. */
  cats: Record<string, number>;
  /** Best first; of the kind and categories chosen. All of them, unless `limit` cut it. */
  hits: Hit[];
};

const HEALTH = 'Health & wellbeing';

/**
 * The one search behind the search panel and the /search page: what is
 * typed, in events, tours, experiences and venues; narrowed by when (not
 * venues, which have no dates) and by category (an event's kinds, a
 * tour's genre; venues have none). Each narrowing counted from what the
 * others leave, so a number is what a tap shows.
 */
export async function runSearch(ask: SearchAsk): Promise<SearchAnswer> {
  const words = searchWords(ask.q);
  const today = jerseyToday();
  const range = resolveWhen({ when: ask.when, from: ask.from, to: ask.to }, today);
  const cats = ask.cats ?? [];
  const shownFrom = range && range.from > today ? range.from : today;

  const found = await publicSearch(words, range);
  // Health listings are for people who live here: found when asked for, by name or by picking Health & wellbeing.
  const healthAsked = words.length > 0 || cats.includes(HEALTH);
  const all: (Hit & { cats: string[]; hidden: boolean })[] = [
    ...found.events.map(({ event: e, venue, next }) => ({
        kind: 'events' as const,
        id: e.id,
        href: `/whats-on/${e.slug}`,
        title: e.title,
        parish: parishFrom(e.parish, venue?.parish),
        when: cardWhen(e.dates, e.occurrence, shownFrom),
        line: [cardLocation(e.venueName ?? venue?.name ?? e.venue, null), printPrice(e.fromPricePence, e.toPricePence, { free: e.free })].filter(Boolean).join(' · ') || null,
        image: e.headerImage,
        highlight: e.highlight,
        fit: fit(e.title, words),
        // Ongoing ones after the dated.
        order: UNIQUE.includes(e.occurrence) || e.highlight ? next : `~${next}`,
        cats: siteTypes(e),
        hidden: hiddenByDefault(e),
      })),
    ...found.tours.map(({ tour: t, provider, next }) => ({
      kind: tourKind(t.title, t.tags, t.genre) === 'tour' ? ('tours' as const) : ('experiences' as const),
      id: t.id,
      href: `/tours/${t.slug}`,
      title: t.title,
      parish: parishFrom(t.parish),
      when: UNIQUE.includes(t.occurrence) ? cardWhen(t.dates, t.occurrence, shownFrom) : 'Book any day',
      line: [t.meetingPoint, provider?.name].filter(Boolean).join(' · ') || null,
      image: t.headerImage,
      highlight: t.highlight,
      fit: fit(t.title, words),
      order: UNIQUE.includes(t.occurrence) || t.highlight ? next : `~${t.title.toLowerCase()}`,
      cats: t.genre ? [t.genre] : [],
      hidden: false,
    })),
    ...found.venues.map((v) => ({
      kind: 'venues' as const,
      id: v.id,
      href: `/venues/${v.slug}`,
      title: v.name,
      parish: parishFrom(v.parish),
      when: null,
      line: v.stayType ?? CATEGORY_LABEL[v.category],
      image: v.headerImage,
      highlight: false,
      fit: fit(v.name, words),
      // Those our guide features first among equals.
      order: `${v.recommendedIn ? 0 : 1}${v.name.toLowerCase()}`,
      cats: [] as string[],
      hidden: false,
    })),
  ];

  type Row = (typeof all)[number];
  const inCats = (h: Row) => !cats.length || h.cats.some((c) => cats.includes(c));
  const ofKind = (h: Row) => !ask.kind || h.kind === ask.kind;

  // A hidden health listing counts only under Health & wellbeing, as on What's on.
  const catCounts: Record<string, number> = {};
  for (const h of all) if (ofKind(h)) for (const c of new Set(h.cats)) if (!h.hidden || c === HEALTH) catCounts[c] = (catCounts[c] ?? 0) + 1;

  const chosen = all.filter((h) => inCats(h) && (!h.hidden || healthAsked));
  const asked = words.length > 0 || range !== null || cats.length > 0;
  return {
    asked,
    range: range ? { ...range, label: rangeLabel(range) } : null,
    counts: kindCounts(chosen),
    cats: catCounts,
    hits: asked ? sortHits(chosen.filter(ofKind)).map(({ cats: _c, hidden: _h, ...h }) => h) : [],
  };
}

/** A few of each kind, for the All view, or the first `max` of one kind: what a phone needs over the wire. */
export function trimHits(hits: Hit[], kind: Kind | undefined, max: number, perKind: number): Hit[] {
  if (kind) return hits.slice(0, max);
  return KINDS.flatMap((k) => hits.filter((h) => h.kind === k).slice(0, perKind));
}

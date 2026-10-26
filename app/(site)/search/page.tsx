import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';
import { Search as SearchIcon } from 'lucide-react';
import { publicSearch } from '@/lib/db/public';
import { hiddenByDefault } from '@/lib/domain/categorise';
import { printParish, printPrice } from '@/lib/domain/house-style';
import { UNIQUE } from '@/lib/domain/occurrence';
import { KINDS, KIND_LABEL, areaCounts, areaFromSlug, areaOf, areaSlug, asKind, fit, kindCounts, narrow, searchWords, sortHits, type Hit, type Kind } from '@/lib/domain/search';
import { cardWhen } from '@/lib/domain/web-dates';
import { jerseyToday } from '@/lib/domain/when';
import { cardLocation } from '@/components/site/listing-card';
import { SearchHit } from '@/components/site/search-hit';
import { CATEGORY_LABEL, one, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Search', description: 'Search events, tours and venues across Jersey, by parish.', robots: { index: false, follow: true } };

/** In the All view, a few of each kind, with a link to the rest. */
const PREVIEW = 4;
/** A kind on its own shows this many; past it, the page asks for an area or another word. */
const MAX = 120;

/**
 * One search box for the whole site, made for a phone: what is typed is
 * looked for in events, tours and venues at once, and two rows of taps
 * narrow it, by kind and by parish. Nothing typed and an area picked is
 * everything in that parish.
 */
export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = one(sp.q);
  const words = searchWords(q);
  const kind = asKind(one(sp.kind));
  const area = areaFromSlug(one(sp.area));
  const today = jerseyToday();
  const browsing = !words.length && !area;

  const found = await publicSearch(words);
  const hits: Hit[] = [
    // Health listings are for people who live here: found when asked for by name, not when browsing.
    ...found.events
      .filter((r) => words.length || !hiddenByDefault(r.event))
      .map(({ event: e, venue, next }): Hit => ({
        kind: 'events',
        id: e.id,
        href: `/whats-on/${e.slug}`,
        title: e.title,
        area: areaOf(e.parish, venue?.parish),
        when: cardWhen(e.dates, e.occurrence, today),
        line: [cardLocation(e.venueName ?? venue?.name ?? e.venue, null), printPrice(e.fromPricePence, e.toPricePence, { free: e.free })].filter(Boolean).join(' · ') || null,
        image: e.headerImage,
        highlight: e.highlight,
        fit: fit(e.title, words),
        // Ongoing ones after the dated.
        order: UNIQUE.includes(e.occurrence) || e.highlight ? next : `~${next}`,
      })),
    ...found.tours.map(({ tour: t, provider, next }): Hit => ({
      kind: 'tours',
      id: t.id,
      href: `/tours/${t.slug}`,
      title: t.title,
      area: areaOf(t.parish),
      when: UNIQUE.includes(t.occurrence) ? cardWhen(t.dates, t.occurrence, today) : 'Book any day',
      line: [t.meetingPoint, provider?.name].filter(Boolean).join(' · ') || null,
      image: t.headerImage,
      highlight: t.highlight,
      fit: fit(t.title, words),
      order: UNIQUE.includes(t.occurrence) || t.highlight ? next : `~${t.title.toLowerCase()}`,
    })),
    ...found.venues.map((v): Hit => ({
      kind: 'venues',
      id: v.id,
      href: `/venues/${v.slug}`,
      title: v.name,
      area: areaOf(v.parish),
      when: null,
      line: v.stayType ?? CATEGORY_LABEL[v.category],
      image: v.headerImage,
      highlight: false,
      fit: fit(v.name, words),
      // Those our guide features first among equals.
      order: `${v.recommendedIn ? 0 : 1}${v.name.toLowerCase()}`,
    })),
  ];

  const kinds = kindCounts(hits, area);
  const areas = areaCounts(hits, kind, area);
  const shown = sortHits(narrow(hits, { kind, area }));

  const href = (o: { kind?: Kind; area?: string | null }) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (o.kind) p.set('kind', o.kind);
    if (o.area) p.set('area', areaSlug(o.area));
    const s = p.toString();
    return s ? `/search?${s}` : '/search';
  };
  const pill = (on: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ${on ? 'bg-harbour text-white' : 'bg-white text-ink ring-1 ring-harbour/15 hover:ring-brand/50'}`;
  const count = (n: number, on: boolean) => <span className={`text-xs font-medium ${on ? 'text-white/70' : 'text-harbour/50'}`}>{n}</span>;
  const where = area ? ` in ${printParish(area)}` : '';

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 md:pt-10">
      <h1 className="sr-only">Search</h1>
      <div className="sticky top-0 z-20 -mx-4 bg-white/95 px-4 pb-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <Form action="/search" scroll={false} role="search" className="relative">
          {kind && <input type="hidden" name="kind" value={kind} />}
          {area && <input type="hidden" name="area" value={areaSlug(area)} />}
          <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-harbour/50" />
          <input
            key={q ?? ''}
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Events, tours, places…"
            aria-label="Search events, tours and venues"
            enterKeyHint="search"
            autoComplete="off"
            autoFocus={browsing}
            className="w-full rounded-full border border-harbour/20 bg-white py-3.5 pl-12 pr-24 text-base text-ink shadow-sm outline-none placeholder:text-harbour/45 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-harbour px-4 py-2 text-sm font-semibold text-white hover:bg-sea">
            Search
          </button>
        </Form>

        {!browsing && (
          <nav aria-label="Kind" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href={href({ area })} scroll={false} aria-current={!kind ? 'page' : undefined} className={pill(!kind)}>
              All {count(kinds.all, !kind)}
            </Link>
            {KINDS.map((k) => (
              <Link key={k} href={href({ kind: k, area })} scroll={false} aria-current={kind === k ? 'page' : undefined} className={pill(kind === k)}>
                {KIND_LABEL[k]} {count(kinds[k], kind === k)}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <section aria-labelledby="areas" className={browsing ? 'mt-6' : 'mt-1'}>
        <h2 id="areas" className={browsing ? 'mb-3 font-display text-lg font-semibold text-ink' : 'sr-only'}>
          {browsing ? 'Or see what’s in a parish' : 'Area'}
        </h2>
        <div className={browsing ? 'flex flex-wrap gap-2' : '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:flex-wrap [&::-webkit-scrollbar]:hidden'}>
          {!browsing && (
            <Link href={href({ kind })} scroll={false} aria-current={!area ? 'page' : undefined} className={pill(!area).replace('font-semibold', 'font-medium')}>
              Anywhere
            </Link>
          )}
          {areas.map((a) => (
            <Link key={a.slug} href={href({ kind, area: a.area === area ? null : a.area })} scroll={false} aria-current={a.area === area ? 'page' : undefined} className={pill(a.area === area).replace('font-semibold', 'font-medium')}>
              {printParish(a.area)} {count(a.n, a.area === area)}
            </Link>
          ))}
        </div>
      </section>

      {!browsing && (
        <div className="mt-6">
          {shown.length === 0 && (
            <p className="rounded-lg bg-white p-8 text-center text-harbour/70">
              Nothing{q ? ` for “${q}”` : ''}{kind ? ` among ${KIND_LABEL[kind].toLowerCase()}` : ''}{where}.
              {(kind || area) && (
                <>
                  {' '}
                  <Link href={href({})} scroll={false} className="font-medium text-brand underline">Search everything, anywhere</Link>
                </>
              )}
            </p>
          )}

          {!kind &&
            KINDS.map((k) => {
              const of = shown.filter((h) => h.kind === k);
              if (!of.length) return null;
              return (
                <section key={k} className="mb-8">
                  <h2 className="mb-3 flex items-baseline justify-between border-b border-harbour/15 pb-2">
                    <span className="font-display text-lg font-semibold text-ink">{KIND_LABEL[k]}</span>
                    <span className="text-sm text-harbour/55">{of.length}</span>
                  </h2>
                  <ul className="grid gap-2.5 md:grid-cols-2">
                    {of.slice(0, PREVIEW).map((h) => <SearchHit key={h.id} hit={h} />)}
                  </ul>
                  {of.length > PREVIEW && (
                    <Link href={href({ kind: k, area })} scroll={false} className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
                      See all {of.length} {KIND_LABEL[k].toLowerCase()} →
                    </Link>
                  )}
                </section>
              );
            })}

          {kind && shown.length > 0 && (
            <>
              <p className="mb-3 text-sm text-harbour/60">
                {shown.length} {shown.length === 1 ? KIND_LABEL[kind].toLowerCase().replace(/s$/, '') : KIND_LABEL[kind].toLowerCase()}{where}
              </p>
              <ul className="grid gap-2.5 md:grid-cols-2">
                {shown.slice(0, MAX).map((h) => <SearchHit key={h.id} hit={h} />)}
              </ul>
              {shown.length > MAX && (
                <p className="mt-4 text-center text-sm text-harbour/60">
                  The first {MAX}. {area ? 'Add a word to narrow them down.' : 'Pick a parish or add a word to narrow them down.'}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

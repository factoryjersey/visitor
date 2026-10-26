import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';
import { Search as SearchIcon } from 'lucide-react';
import { runSearch } from '@/lib/search';
import { KINDS, KIND_LABEL, asKind, searchWords, type Kind } from '@/lib/domain/search';
import { jerseyToday, rangeLabel, resolveWhen } from '@/lib/domain/when';
import { SearchHit } from '@/components/site/search-hit';
import { WhenPicker } from '@/components/site/when-picker';
import { many, one, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Search', description: 'Search events, tours, experiences and venues across Jersey, on the days you choose.', robots: { index: false, follow: true } };

/** In the All view, a few of each kind, with a link to the rest. */
const PREVIEW = 4;
/** A kind on its own shows this many; past it, the page asks for another word or fewer days. */
const MAX = 120;

/**
 * The search as a page: an address to share, the search panel's "see all",
 * and search for browsers without scripts. Same search as the panel
 * (lib/search.ts): words, kind, when and category.
 */
export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = one(sp.q);
  const words = searchWords(q);
  const kind = asKind(one(sp.kind));
  const today = jerseyToday();
  const asked = { when: one(sp.when), from: one(sp.from), to: one(sp.to) };
  const range = resolveWhen(asked, today);
  const dates = range?.pick === 'dates' ? { from: range.from, to: range.to === '9999-12-31' ? undefined : range.to } : {};
  const when = range?.pick ?? (asked.when === 'dates' ? 'dates' : undefined);
  const cats = many(sp.cat);
  const browsing = !words.length && !range && !cats.length;

  const answer = await runSearch({ q, kind, when: asked.when, from: asked.from, to: asked.to, cats });
  const kinds = answer.counts;
  const shown = answer.hits;

  const href = (k?: Kind) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (k) p.set('kind', k);
    if (when && when !== 'dates') p.set('when', when);
    if (dates.from) p.set('from', dates.from);
    if (dates.to) p.set('to', dates.to);
    for (const c of cats) p.append('cat', c);
    const s = p.toString();
    return s ? `/search?${s}` : '/search';
  };
  const pill = (on: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ${on ? 'bg-harbour text-white' : 'bg-white text-ink ring-1 ring-harbour/15 hover:ring-brand/50'}`;
  const count = (n: number, on: boolean) => <span className={`text-xs font-medium ${on ? 'text-white/70' : 'text-harbour/50'}`}>{n}</span>;
  const on = range ? ` on ${rangeLabel(range)}` : '';
  // Venues have no dates: with a day chosen they are still found by name, but the day does not narrow them.
  const kindsShown = KINDS.filter((k) => k !== 'venues' || words.length);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 md:pt-10">
      <h1 className="sr-only">Search</h1>
      <Form key={JSON.stringify({ q, kind, when, ...dates })} action="/search" scroll={false} role="search" className="sticky top-0 z-20 -mx-4 bg-white/95 px-4 pb-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        {kind && <input type="hidden" name="kind" value={kind} />}
        {cats.map((c) => <input key={c} type="hidden" name="cat" value={c} />)}
        <div className="relative">
          <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-harbour/50" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Events, tours, places…"
            aria-label="Search events, tours, experiences and venues"
            enterKeyHint="search"
            autoComplete="off"
            autoFocus={browsing}
            className="w-full rounded-full border border-harbour/20 bg-white py-3.5 pl-12 pr-24 text-base text-ink shadow-sm outline-none placeholder:text-harbour/45 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-harbour px-4 py-2 text-sm font-semibold text-white hover:bg-sea">
            Search
          </button>
        </div>
        <div className="mt-3">
          <WhenPicker when={when} from={dates.from} to={dates.to} today={today} row quiet />
        </div>
      </Form>

      {browsing && <p className="mt-6 text-harbour/70">Search for an event, a tour or a place, or pick a day to see everything on.</p>}

      {!browsing && (
        <>
          <nav aria-label="Kind" className="-mx-4 mt-2 flex gap-2 overflow-x-auto border-t border-harbour/10 px-4 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href={href()} scroll={false} aria-current={!kind ? 'page' : undefined} className={pill(!kind)}>
              All {count(kinds.all, !kind)}
            </Link>
            {kindsShown.map((k) => (
              <Link key={k} href={href(k)} scroll={false} aria-current={kind === k ? 'page' : undefined} className={pill(kind === k)}>
                {KIND_LABEL[k]} {count(kinds[k], kind === k)}
              </Link>
            ))}
          </nav>

          <div className="mt-6">
            {shown.length === 0 && (
              <p className="rounded-lg bg-white p-8 text-center text-harbour/70 ring-1 ring-harbour/5">
                Nothing{q ? ` for “${q}”` : ''}{kind ? ` among ${KIND_LABEL[kind].toLowerCase()}` : ''}{on}.
                {range && (
                  <>
                    {' '}
                    <Link href={`/search${q ? `?q=${encodeURIComponent(q)}` : ''}`} scroll={false} className="font-medium text-brand underline">Try any time</Link>
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
                      <Link href={href(k)} scroll={false} className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
                        See all {of.length} {KIND_LABEL[k].toLowerCase()} →
                      </Link>
                    )}
                  </section>
                );
              })}

            {kind && shown.length > 0 && (
              <>
                <p className="mb-3 text-sm text-harbour/60">
                  {shown.length} {shown.length === 1 ? KIND_LABEL[kind].toLowerCase().replace(/s$/, '') : KIND_LABEL[kind].toLowerCase()}
                  {kind !== 'venues' && on}
                </p>
                <ul className="grid gap-2.5 md:grid-cols-2">
                  {shown.slice(0, MAX).map((h) => <SearchHit key={h.id} hit={h} />)}
                </ul>
                {shown.length > MAX && <p className="mt-4 text-center text-sm text-harbour/60">The first {MAX}. Add a word or pick fewer days to narrow them down.</p>}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

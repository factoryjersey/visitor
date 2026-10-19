import type { Metadata } from 'next';
import { CategoryMenu } from '@/components/site/category-menu';
import { FilterBar, monthHeading, monthOptions } from '@/components/site/filter-bar';
import { ListingCard, cardLocation } from '@/components/site/listing-card';
import { publicEvents, todayIso } from '@/lib/db/public';
import { printPrice } from '@/lib/domain/house-style';
import { UNIQUE } from '@/lib/domain/occurrence';
import { cardWhen } from '@/lib/domain/web-dates';
import { one, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: "What's on", description: 'Events in Jersey: festivals, concerts, markets, shows and more.' };

function group<T>(items: T[], key: (t: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const i of items) m.set(key(i), [...(m.get(key(i)) ?? []), i]);
  return [...m.entries()];
}

/**
 * What's on. One-off and dated events by default; exhibitions, daily
 * attractions and weekly sessions come in when the visitor ticks for them.
 */
export default async function WhatsOn({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const values = { q: one(sp.q), month: one(sp.month), venue: one(sp.venue), type: one(sp.type), ongoing: one(sp.ongoing) };
  // Narrowed a step at a time, each step counted for the choice that narrows it: the venues
  // from what the search finds, the kinds from what is on at the venue chosen.
  const found = await publicEvents({ showOngoing: values.ongoing === '1', month: values.month, q: values.q });
  const venues = new Map<string, { name: string; n: number }>();
  for (const r of found) if (r.venue?.slug) venues.set(r.venue.slug, { name: r.venue.name, n: (venues.get(r.venue.slug)?.n ?? 0) + 1 });
  const all = values.venue ? found.filter((r) => r.venue?.slug === values.venue) : found;
  const counts = new Map<string, number>();
  for (const r of all) for (const t of new Set(r.event.eventTypes)) counts.set(t, (counts.get(t) ?? 0) + 1);
  const rows = values.type ? all.filter((r) => r.event.eventTypes.includes(values.type!)) : all;
  const venueOptions = [...venues]
    .sort(([, a], [, b]) => a.name.localeCompare(b.name))
    .map(([slug, v]) => ({ value: slug, label: `${v.name} (${v.n})` }));
  const today = todayIso();
  const highlights = rows.filter((r) => r.event.highlight);
  const rest = rows.filter((r) => !r.event.highlight);

  const card = ({ event: e, venue }: (typeof rows)[number], highlight = false, wide = false) => (
    <ListingCard
      key={e.id}
      href={`/whats-on/${e.slug}`}
      title={e.title}
      when={cardWhen(e.dates, e.occurrence, today)}
      location={cardLocation(e.venueName ?? venue?.name ?? e.venue, e.parish ?? venue?.parish)}
      price={printPrice(e.fromPricePence, e.toPricePence, { free: e.free })}
      image={e.headerImage}
      types={e.eventTypes}
      tag={UNIQUE.includes(e.occurrence) ? null : e.occurrence === 'regular' ? 'Regular' : 'Ongoing'}
      highlight={highlight}
      wide={wide}
      summary={wide ? (e.guideCopy ?? e.summary) : (e.summary ?? e.guideCopy)}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 font-display text-3xl font-bold text-ink">What&apos;s on</h1>
      <p className="mb-8 max-w-2xl text-harbour/70">Festivals, concerts, markets and shows around the island.</p>
      <FilterBar
        action="/whats-on"
        values={values}
        selects={[
          { name: 'month', label: 'When', options: monthOptions() },
          { name: 'venue', label: 'Venue', options: venueOptions },
        ]}
        toggle={{ name: 'ongoing', label: 'Include ongoing events', hint: 'Exhibitions, attractions open every day and weekly sessions' }}
        keep={['type']}
      />
      <CategoryMenu action="/whats-on" values={values} counts={counts} total={all.length} />

      {highlights.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand">Highlights</h2>
          <div className={`grid gap-6 ${highlights.length > 1 ? 'md:grid-cols-2' : ''}`}>{highlights.map((r) => card(r, true, highlights.length === 1))}</div>
        </section>
      )}

      {rest.length === 0 && highlights.length === 0 && (
        <p className="rounded-lg bg-white p-8 text-center text-harbour/70">Nothing matches. Try another month{values.ongoing !== '1' && ', or include ongoing events'}.</p>
      )}

      {group(rest, (r) => r.next.slice(0, 7)).map(([month, items]) => (
        <section key={month} className="mb-12">
          <h2 className="mb-4 border-b border-harbour/15 pb-2 font-display text-xl font-semibold text-ink">{monthHeading(month)}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((r) => card(r))}</div>
        </section>
      ))}
    </div>
  );
}

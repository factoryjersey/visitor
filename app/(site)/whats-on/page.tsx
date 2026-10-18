import type { Metadata } from 'next';
import { FilterBar, monthHeading, monthOptions } from '@/components/site/filter-bar';
import { ListingCard, cardLocation } from '@/components/site/listing-card';
import { publicEventTypes, publicEvents, todayIso } from '@/lib/db/public';
import { printPrice } from '@/lib/domain/house-style';
import { UNIQUE } from '@/lib/domain/occurrence';
import { webWhen } from '@/lib/domain/web-dates';
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
  const values = { q: one(sp.q), month: one(sp.month), type: one(sp.type), ongoing: one(sp.ongoing) };
  const [rows, types] = await Promise.all([
    publicEvents({ showOngoing: values.ongoing === '1', month: values.month, type: values.type, q: values.q }),
    publicEventTypes(),
  ]);
  const today = todayIso();
  const highlights = rows.filter((r) => r.event.highlight);
  const rest = rows.filter((r) => !r.event.highlight);

  const card = ({ event: e, venue }: (typeof rows)[number], highlight = false, wide = false) => (
    <ListingCard
      key={e.id}
      href={`/whats-on/${e.slug}`}
      title={e.title}
      when={webWhen(e.dates, e.occurrence, today)}
      location={cardLocation(e.venueName ?? venue?.name ?? e.venue, e.parish ?? venue?.parish)}
      price={printPrice(e.fromPricePence, e.toPricePence, { free: e.free })}
      image={e.headerImage}
      tag={UNIQUE.includes(e.occurrence) ? null : e.occurrence === 'regular' ? 'Regular' : 'Ongoing'}
      highlight={highlight}
      wide={wide}
      summary={e.guideCopy ?? e.summary}
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
          { name: 'type', label: 'Type', options: types.map((t) => ({ value: t, label: t })) },
        ]}
        toggle={{ name: 'ongoing', label: 'Include ongoing events', hint: 'Exhibitions, attractions open every day and weekly sessions' }}
      />

      {highlights.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-coral">Highlights</h2>
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

import type { Metadata } from 'next';
import { FilterBar, monthOptions } from '@/components/site/filter-bar';
import { ListingCard, cardLocation } from '@/components/site/listing-card';
import { publicTours, todayIso } from '@/lib/db/public';
import { GENRES, type Genre } from '@/lib/domain/genre';
import { printPrice } from '@/lib/domain/house-style';
import { UNIQUE } from '@/lib/domain/occurrence';
import { cardWhen } from '@/lib/domain/web-dates';
import { one, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tours & experiences', description: 'Guided walks, tide walks, boat trips and experiences in Jersey.' };

/**
 * Tours on particular dates by default: tide walks, ghost walks,
 * workshops. Those bookable any day come in with the tick, listed after.
 */
export default async function Tours({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const values = { q: one(sp.q), month: one(sp.month), genre: one(sp.genre), any: one(sp.any) };
  const genre = (GENRES as readonly string[]).includes(values.genre ?? '') ? (values.genre as Genre) : undefined;
  const rows = await publicTours({ showOnDemand: values.any === '1', genre, month: values.month, q: values.q });
  const today = todayIso();
  const dated = rows.filter((r) => UNIQUE.includes(r.tour.occurrence) || r.tour.highlight);
  const onDemand = rows.filter((r) => !UNIQUE.includes(r.tour.occurrence) && !r.tour.highlight);

  const card = ({ tour: t, provider }: (typeof rows)[number]) => (
    <ListingCard
      key={t.id}
      href={`/tours/${t.slug}`}
      title={t.title}
      when={UNIQUE.includes(t.occurrence) ? cardWhen(t.dates, t.occurrence, today) : 'Book any day'}
      location={cardLocation(t.meetingPoint, t.parish)}
      where={[provider?.name, t.duration].filter(Boolean).join(' · ')}
      price={printPrice(t.fromPricePence, t.toPricePence)}
      image={t.headerImage}
      summary={t.summary ?? t.guideCopy}
      tag={t.genre}
      highlight={t.highlight}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 font-display text-3xl font-bold text-ink">Tours &amp; experiences</h1>
      <p className="mb-8 max-w-2xl text-harbour/70">Walks on the seabed at low tide, ghost walks, boat trips and workshops, with local guides.</p>
      <FilterBar
        action="/tours"
        values={values}
        selects={[
          { name: 'month', label: 'When', options: monthOptions() },
          { name: 'genre', label: 'Kind', options: GENRES.map((g) => ({ value: g, label: g })) },
        ]}
        toggle={{ name: 'any', label: 'Include tours you can book any day', hint: 'Boat trips, bike hire, activity centres and other experiences on demand' }}
      />
      {dated.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 border-b border-harbour/15 pb-2 font-display text-xl font-semibold text-ink">On these dates</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{dated.map(card)}</div>
        </section>
      )}
      {onDemand.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 border-b border-harbour/15 pb-2 font-display text-xl font-semibold text-ink">Book any day</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{onDemand.map(card)}</div>
        </section>
      )}
      {rows.length === 0 && (
        <p className="rounded-lg bg-white p-8 text-center text-harbour/70">Nothing matches. Try another month{values.any !== '1' && ', or include tours you can book any day'}.</p>
      )}
    </div>
  );
}

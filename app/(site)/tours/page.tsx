import type { Metadata } from 'next';
import { alternates } from '@/lib/agents/data';
import { CategoryMenu } from '@/components/site/category-menu';
import { FilterBar, monthOptions } from '@/components/site/filter-bar';
import { ListingCard, cardLocation } from '@/components/site/listing-card';
import { publicTours, todayIso } from '@/lib/db/public';
import { GENRES, type Genre } from '@/lib/domain/genre';
import { printParish, printPrice } from '@/lib/domain/house-style';
import { UNIQUE } from '@/lib/domain/occurrence';
import { cardWhen } from '@/lib/domain/web-dates';
import { one, type SearchParams } from '@/lib/params';
import { JsonLd } from '@/components/site/json-ld';
import { SITE } from '@/lib/agents/data';
import { itemList } from '@/lib/agents/schema-org';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tours & experiences', description: 'Guided walks, tide walks, boat trips and experiences in Jersey.', alternates: alternates('/tours') };

/**
 * Tours on particular dates by default: tide walks, ghost walks,
 * workshops. Those bookable any day come in with the tick, listed after.
 */
export default async function Tours({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const values = { q: one(sp.q), month: one(sp.month), genre: one(sp.genre), where: one(sp.where), by: one(sp.by), any: one(sp.any) };
  const genre = (GENRES as readonly string[]).includes(values.genre ?? '') ? (values.genre as Genre) : undefined;
  const found = await publicTours({ showOnDemand: values.any === '1', month: values.month, q: values.q });

  // Where they start and who runs them, each counted from what the other choices leave.
  const inParish = (r: (typeof found)[number]) => !values.where || printParish(r.tour.parish) === values.where;
  const runBy = (r: (typeof found)[number]) => !values.by || r.provider?.id === values.by;
  const ofGenre = (r: (typeof found)[number]) => !genre || r.tour.genre === genre;
  const tally = (rs: typeof found, key: (r: (typeof found)[number]) => [string, string] | null) => {
    const m = new Map<string, { label: string; n: number }>();
    for (const r of rs) {
      const k = key(r);
      if (k) m.set(k[0], { label: k[1], n: (m.get(k[0])?.n ?? 0) + 1 });
    }
    return [...m].sort(([, a], [, b]) => a.label.localeCompare(b.label)).map(([value, v]) => ({ value, label: `${v.label} (${v.n})` }));
  };
  const parishOptions = tally(found.filter((r) => runBy(r) && ofGenre(r)), (r) => {
    const p = printParish(r.tour.parish);
    return p ? [p, p] : null;
  });
  const providerOptions = tally(found.filter((r) => inParish(r) && ofGenre(r)), (r) => (r.provider?.id ? [r.provider.id, r.provider.name] : null));
  const placed = found.filter((r) => inParish(r) && runBy(r));
  // The genre tiles count what the other choices leave; then the genre chosen.
  const counts = new Map<string, number>();
  for (const r of placed) if (r.tour.genre) counts.set(r.tour.genre, (counts.get(r.tour.genre) ?? 0) + 1);
  const rows = genre ? placed.filter((r) => r.tour.genre === genre) : placed;
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
      genre={t.genre}
      summary={t.summary ?? t.guideCopy}
      highlight={t.highlight}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd data={itemList('Tours & experiences in Jersey', rows.map((r) => `${SITE}/tours/${r.tour.slug}`))} />
      <h1 className="mb-2 font-display text-3xl font-bold text-ink">Tours &amp; experiences</h1>
      <p className="mb-8 max-w-2xl text-harbour/70">Walks on the seabed at low tide, ghost walks, boat trips and workshops, with local guides.</p>
      <FilterBar
        action="/tours"
        values={values}
        selects={[
          { name: 'month', label: 'When', options: monthOptions() },
          { name: 'where', label: 'Where', options: parishOptions },
          { name: 'by', label: 'Run by', options: providerOptions },
        ]}
        toggle={{ name: 'any', label: 'Include tours you can book any day', hint: 'Boat trips, bike hire, activity centres and other experiences on demand' }}
        keep={['genre']}
      />
      <CategoryMenu action="/tours" values={values} counts={counts} total={placed.length} of="tours" />
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

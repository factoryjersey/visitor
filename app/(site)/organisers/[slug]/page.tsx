import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ListingCard, cardLocation } from '@/components/site/listing-card';
import { publicOrganiser, todayIso } from '@/lib/db/public';
import { printPrice, printWebsite } from '@/lib/domain/house-style';
import { UNIQUE } from '@/lib/domain/occurrence';
import { cardWhen } from '@/lib/domain/web-dates';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await publicOrganiser((await params).slug);
  return found ? { title: found.organiser.name } : {};
}

/** An organiser's programme: their events, then their tours. */
export default async function OrganiserPage({ params }: Props) {
  const found = await publicOrganiser((await params).slug);
  if (!found) notFound();
  const { organiser: o, events, tours } = found;
  const today = todayIso();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/organisers" className="text-sm text-harbour/60 hover:text-coral">← Organisers</Link>
      <header className="mb-8 mt-3">
        <h1 className="font-display text-3xl font-bold leading-tight text-ink md:text-4xl">{o.name}</h1>
        {o.website && (
          <a href={o.website} target="_blank" rel="noopener" className="mt-2 inline-block text-sea hover:text-coral">
            {printWebsite(o.website)?.toLowerCase()} ↗
          </a>
        )}
      </header>

      {events.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 border-b border-harbour/15 pb-2 font-display text-xl font-semibold text-ink">Events</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map(({ event: e, venue }) => (
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
                summary={e.summary ?? e.guideCopy}
              />
            ))}
          </div>
        </section>
      )}

      {tours.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 border-b border-harbour/15 pb-2 font-display text-xl font-semibold text-ink">Tours &amp; experiences</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map(({ tour: t }) => (
              <ListingCard
                key={t.id}
                href={`/tours/${t.slug}`}
                title={t.title}
                when={UNIQUE.includes(t.occurrence) ? cardWhen(t.dates, t.occurrence, today) : 'Book any day'}
                location={cardLocation(t.meetingPoint, t.parish)}
                where={t.duration}
                price={printPrice(t.fromPricePence, t.toPricePence)}
                image={t.headerImage}
                genre={t.genre}
                summary={t.summary ?? t.guideCopy}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

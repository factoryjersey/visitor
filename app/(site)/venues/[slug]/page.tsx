import type { Metadata } from 'next';
import { alternates } from '@/lib/agents/data';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Copy, Facts, Hero, directionsUrl, primaryButton, secondaryButton } from '@/components/site/detail';
import { ListingCard, cardLocation } from '@/components/site/listing-card';
import { publicEventsAt, publicVenue, todayIso } from '@/lib/db/public';
import { StaffFallback } from '@/components/site/staff-fallback';
import { Recommended } from '@/components/site/recommended';
import { staffViewer } from '@/lib/auth/session';
import { printAddress, printPrice, printWebsite } from '@/lib/domain/house-style';
import { UNIQUE } from '@/lib/domain/occurrence';
import { cardWhen } from '@/lib/domain/web-dates';
import { JsonLd } from '@/components/site/json-ld';
import { webImage } from '@/lib/domain/images';
import { eventOut, venueOut } from '@/lib/agents/data';
import { breadcrumbs, venueLd } from '@/lib/agents/schema-org';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const v = await publicVenue((await params).slug);
  return v ? { title: v.name, description: v.summary ?? undefined, alternates: alternates(`/venues/${v.slug}`) } : {};
}

/** A venue: what it is, how to get there, and everything on there. */
export default async function VenuePage({ params }: Props) {
  const venue = await publicVenue((await params).slug);
  if (!venue) notFound();
  const [rows, staff] = await Promise.all([publicEventsAt(venue.id), staffViewer()]);
  const today = todayIso();
  const address = printAddress(venue);
  const directions = directionsUrl(venue.lat, venue.lon, venue.name);
  const unique = rows.filter((r) => UNIQUE.includes(r.event.occurrence));
  const ongoing = rows.filter((r) => !UNIQUE.includes(r.event.occurrence));

  const card = ({ event: e, venue: v }: (typeof rows)[number]) => (
    <ListingCard
      key={e.id}
      href={`/whats-on/${e.slug}`}
      title={e.title}
      when={cardWhen(e.dates, e.occurrence, today)}
      location={cardLocation(e.venueName ?? v?.name, e.parish ?? v?.parish)}
      price={printPrice(e.fromPricePence, e.toPricePence, { free: e.free })}
      image={e.headerImage}
      types={e.eventTypes}
      tag={UNIQUE.includes(e.occurrence) ? null : e.occurrence === 'regular' ? 'Regular' : 'Ongoing'}
      summary={e.summary ?? e.guideCopy}
    />
  );

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      <JsonLd
        data={[
          venueLd({ ...venueOut(venue), image: venue.headerImage ? webImage(venue.headerImage, 1200, 800) : null }, rows.map((r) => eventOut(r.event, r.venue, today))),
          breadcrumbs([['Venues', '/venues'], [venue.name, `/venues/${venue.slug}`]]),
        ]}
      />
      <Link href="/venues" className="text-sm text-harbour/60 hover:text-brand">← Venues</Link>
      <header className="mb-6 mt-3">
        <h1 className="font-display text-3xl font-bold leading-tight text-ink md:text-4xl">{venue.name}</h1>
        {venue.recommendedIn && <Recommended className="mt-3" />}
        {address && <p className="mt-2 text-lg text-harbour/70">{address}</p>}
      </header>
      {staff && <StaffFallback kind="venue" id={venue.id} name={venue.name} image={venue.fallbackImage && { url: venue.fallbackImage.url, alt: venue.fallbackImage.alt }} />}
      <Hero image={venue.headerImage} title={venue.name} />
      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
        <Copy lead={venue.guideCopy ?? venue.summary} body={venue.description} />
        <Facts
          rows={[
            ['Address', address],
            ['Phone', venue.phone && <a href={`tel:${venue.phone.replace(/[^\d+]/g, '')}`} className="hover:text-brand">{venue.phone}</a>],
            ['Website', venue.website && <a href={venue.website} target="_blank" rel="noopener" className="text-sea hover:text-brand">{printWebsite(venue.website)?.toLowerCase()} ↗</a>],
          ]}
          actions={
            <>
              {venue.website && <a href={venue.website} target="_blank" rel="noopener" className={primaryButton}>Visit their website ↗</a>}
              {directions && <a href={directions} target="_blank" rel="noopener" className={secondaryButton}>Directions</a>}
              {!venue.businessId && (
                <Link href={`/claim/venues/${venue.slug}`} className="mt-2 text-center text-xs text-harbour/50 underline decoration-harbour/20 underline-offset-2 hover:text-brand">
                  Is this your venue? Claim it
                </Link>
              )}
            </>
          }
        />
      </div>

      <section className="mt-12">
        <h2 className="mb-4 border-b border-harbour/15 pb-2 font-display text-xl font-semibold text-ink">Coming up here</h2>
        {unique.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{unique.map(card)}</div>
        ) : (
          <p className="text-harbour/70">Nothing dated at the moment.</p>
        )}
      </section>
      {ongoing.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 border-b border-harbour/15 pb-2 font-display text-xl font-semibold text-ink">On regularly</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{ongoing.map(card)}</div>
        </section>
      )}
    </article>
  );
}

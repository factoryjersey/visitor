import type { Metadata } from 'next';
import { alternates } from '@/lib/agents/data';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ClaimLink, Copy, DetailLayout, Facts, Gallery, Hero, SideSection, directionsUrl, primaryButton, secondaryButton } from '@/components/site/detail';
import { ListingCard, cardLocation } from '@/components/site/listing-card';
import { publicEventsAt, publicVenue, todayIso, venueFormerlyAt } from '@/lib/db/public';
import { StaffFallback } from '@/components/site/staff-fallback';
import { StaffEdit } from '@/components/site/staff-edit';
import { Recommended } from '@/components/site/recommended';
import { OnVisitorMap } from '@/components/site/visitor-map';
import { NewBadge } from '@/components/site/new-badge';
import { isNewVenue } from '@/lib/domain/new-venue';
import { openingText } from '@/lib/domain/opening';
import { GoogleReviews } from '@/components/site/google-reviews';
import { googleConfigured } from '@/lib/integrations/google/places';
import { staffViewer } from '@/lib/auth/session';
import { printAddress, printPrice, siteLabel, socialSite } from '@/lib/domain/house-style';
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
  return v ? { title: v.name, description: v.guideCopy ?? v.summary ?? undefined, alternates: alternates(`/venues/${v.slug}`) } : {};
}

/** A venue: what it is, how to get there, and everything on there. */
export default async function VenuePage({ params }: Props) {
  const { slug } = await params;
  const venue = await publicVenue(slug);
  if (!venue) {
    const now = await venueFormerlyAt(slug);
    if (now) permanentRedirect(`/venues/${now}`);
    notFound();
  }
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

  const phone = venue.phone && <a href={`tel:${venue.phone.replace(/[^\d+]/g, '')}`} className="hover:text-brand">{venue.phone}</a>;

  return (
    <article>
      <JsonLd
        data={[
          venueLd({ ...venueOut(venue), image: venue.headerImage ? webImage(venue.headerImage, 1200, 800) : null }, rows.map((r) => eventOut(r.event, r.venue, today))),
          breadcrumbs([['Venues', '/venues'], [venue.name, `/venues/${venue.slug}`]]),
        ]}
      />
      {staff && <StaffEdit kind="venue" id={venue.id} title={venue.name} summary={venue.summary} description={venue.description} image={venue.headerImage ? { url: webImage(venue.headerImage, 800, 400), alt: venue.headerImage.alt, stock: !!venue.headerImage.credit } : null} adminHref={`/admin/venues/${venue.slug}`} />}
      <DetailLayout
        main={
          <>
            <Link href="/venues" className="text-sm text-harbour/60 hover:text-brand">← Venues</Link>
            <header className="mb-6 mt-3">
              <h1 className="font-display text-3xl font-bold leading-tight text-ink md:text-4xl">{venue.name}</h1>
              {(venue.recommendedIn || venue.visitorMap || isNewVenue(venue.firstListedAt)) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {isNewVenue(venue.firstListedAt) && <NewBadge />}
                  {venue.recommendedIn && <Recommended />}
                  {venue.visitorMap && <OnVisitorMap edition={venue.visitorMap} />}
                </div>
              )}
              {address && <p className="mt-2 text-lg text-harbour/70">{address}</p>}
            </header>
            {staff && <StaffFallback kind="venue" id={venue.id} name={venue.name} image={venue.fallbackImage && { url: venue.fallbackImage.url, alt: venue.fallbackImage.alt }} />}
            <Hero image={venue.headerImage} title={venue.name} />
            <div className="mt-8 space-y-6">
              <Copy lead={venue.guideCopy ?? venue.summary} body={venue.description} />
              <Gallery images={venue.gallery} header={venue.headerImage} title={venue.name} />
            </div>

            {venue.googlePlaceId && googleConfigured() && <GoogleReviews slug={venue.slug} />}

            <section className="mt-12">
              <h2 className="mb-4 border-b border-harbour/15 pb-2 font-display text-xl font-semibold text-ink">Coming up here</h2>
              {unique.length ? <div className="grid gap-6 sm:grid-cols-2">{unique.map(card)}</div> : <p className="text-harbour/70">Nothing dated at the moment.</p>}
            </section>
            {ongoing.length > 0 && (
              <section className="mt-12">
                <h2 className="mb-4 border-b border-harbour/15 pb-2 font-display text-xl font-semibold text-ink">On regularly</h2>
                <div className="grid gap-6 sm:grid-cols-2">{ongoing.map(card)}</div>
              </section>
            )}
          </>
        }
        side={
          <SideSection title="Visit">
            <Facts
              rows={[
                ['Address', address],
                ['Open', openingText(venue.openingHours, venue.openMonths)],
                ['Phone', phone],
                ['Email', venue.email && <a href={`mailto:${venue.email}`} className="hover:text-brand">{venue.email}</a>],
                [socialSite(venue.website) ?? 'Website', venue.website && <a href={venue.website} target="_blank" rel="noopener" className="text-sea hover:text-brand">{siteLabel(venue.website)} ↗</a>],
                ['Coming up', rows.length ? `${rows.length} event${rows.length === 1 ? '' : 's'}` : null],
              ]}
            />
            <div className="mt-4 flex flex-col gap-2">
              {venue.website && <a href={venue.website} target="_blank" rel="noopener" className={primaryButton}>{socialSite(venue.website) ? `Their ${socialSite(venue.website)} page` : 'Visit their website'} ↗</a>}
              {directions && <a href={directions} target="_blank" rel="noopener" className={secondaryButton}>Directions</a>}
            </div>
            {!venue.businessId && <ClaimLink href={`/claim/venues/${venue.slug}`}>Is this your venue? Claim it</ClaimLink>}
          </SideSection>
        }
      />
    </article>
  );
}

import type { Metadata } from 'next';
import { alternates } from '@/lib/agents/data';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Copy, DateList, Facts, Hero, ListingHeader, directionsUrl, primaryButton, secondaryButton, timesSummary } from '@/components/site/detail';
import { ListingCard, cardLocation } from '@/components/site/listing-card';
import { StaffEdit } from '@/components/site/staff-edit';
import { staffViewer } from '@/lib/auth/session';
import { EVENT_TYPES } from '@/lib/domain/categorise';
import { publicEvent, publicRelatedEvents, publicVenueEvents, todayIso } from '@/lib/db/public';
import { printAddress, printPrice, printTimes, printWebsite } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import { slugify } from '@/lib/domain/slug';
import { cardWhen, headerWhen, upcomingDates, webWhen } from '@/lib/domain/web-dates';
import { JsonLd } from '@/components/site/json-ld';
import { eventOut } from '@/lib/agents/data';
import { breadcrumbs, eventLd } from '@/lib/agents/schema-org';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await publicEvent((await params).slug);
  if (!row) return {};
  const e = row.event;
  return {
    title: e.title,
    description: e.summary ?? undefined,
    alternates: alternates(`/whats-on/${e.slug}`),
    openGraph: { title: e.title, description: e.summary ?? undefined, images: e.headerImage ? [webImage(e.headerImage, 1200, 630)] : [] },
  };
}

export default async function EventPage({ params }: Props) {
  const row = await publicEvent((await params).slug);
  if (!row) notFound();
  const { event: e, venue } = row;
  const today = todayIso();
  const upcoming = upcomingDates(e.dates, today);
  const venueName = e.venueName ?? venue?.name ?? e.venue;
  const address = e.addressLine1 || e.parish ? printAddress(e) : venue ? printAddress(venue) : null;
  const directions = directionsUrl(e.lat ?? venue?.lat ?? null, e.lon ?? venue?.lon ?? null, venueName);
  const price = printPrice(e.fromPricePence, e.toPricePence, { free: e.free });

  // Structured data, so search results and agents can show the dates and the venue.
  const jsonLd = [eventLd(eventOut(e, venue, today)), breadcrumbs([['What’s on', '/whats-on'], [e.title, `/whats-on/${e.slug}`]])];

  const [atVenue, staff] = await Promise.all([publicVenueEvents(e), staffViewer()]);
  // Not what the sidebar already lists.
  const related = await publicRelatedEvents(e, [e.id, ...atVenue.map((o) => o.event.id)]);
  // The organiser's own link from the feed. jersey.com's page about the listing is not one: it only sends people on again.
  const ownLink = (u: string | null) => (u && !/(^|\.)jersey\.com$/i.test(printWebsite(u) ?? '') ? u : null);
  const tickets = ownLink(e.website) ?? ownLink(e.sourceLink);
  const venueSite = venue?.website && venue.website !== e.website ? venue.website : null;
  const contact = e.phone
    ? <a href={`tel:${e.phone.replace(/[^\d+]/g, '')}`} className="hover:text-brand">{e.phone}</a>
    : e.email && <a href={`mailto:${e.email}`} className="hover:text-brand">{e.email}</a>;

  return (
    <article>
      {staff && (
        <StaffEdit kind="event" id={e.id} title={e.title} summary={e.summary} description={e.description} image={e.headerImage ? { url: webImage(e.headerImage, 800, 400), alt: e.headerImage.alt, stock: !!e.headerImage.credit } : null} printLine={e.printLine} eventTypes={e.eventTypes} allTypes={EVENT_TYPES} adminHref={`/admin/whats-on/${e.slug}`} />
      )}
      <JsonLd data={jsonLd} />
      <div className="mx-auto grid max-w-6xl md:grid-cols-[1fr_340px]">
        <div className="min-w-0 px-4 py-8 md:pr-10">
          <Link href="/whats-on" className="text-sm text-harbour/60 hover:text-brand">← What&apos;s on</Link>
          <ListingHeader
            when={headerWhen(e.dates, e.occurrence, today)}
            title={e.title}
            label={e.highlight ? 'Highlight' : null}
            where={venueName ? { name: venueName, href: venue ? `/venues/${venue.slug}` : null } : null}
            by={e.organiser ? { name: e.organiser, href: `/organisers/${slugify(e.organiser)}` } : null}
          />
          <Hero image={e.headerImage} title={e.title} />
          <div className="mt-8 space-y-6">
            <Copy lead={e.guideCopy ?? e.summary} body={e.description} />
            <DateList dates={e.dates} today={today} />
          </div>
        </div>

        {/* The whole height of the page, so what to do next is always beside what it is. */}
        <aside className="border-t border-harbour/10 bg-white px-4 py-8 md:border-l md:border-t-0 md:px-6">
          <div className="space-y-8 md:sticky md:top-6">
            <SideSection title="Tickets">
              <Facts
                rows={[
                  ['When', webWhen(e.dates, e.occurrence, today)],
                  ['Times', timesSummary(printTimes(e.dates.filter((d) => d.date >= today)))],
                  ['Price', price],
                  ['Contact', contact],
                ]}
              />
              <div className="mt-4 flex flex-col gap-2">
                {tickets && (
                  <>
                    <a href={tickets} target="_blank" rel="noopener" className={primaryButton}>{e.free ? 'Details & booking' : 'Tickets & information'} ↗</a>
                    <p className="text-center text-xs text-harbour/50">on {printWebsite(tickets)?.toLowerCase()}</p>
                  </>
                )}
              </div>
              {e.organiser && (
                <p className="mt-4 text-sm text-harbour/70">
                  Organised by <Link href={`/organisers/${slugify(e.organiser)}`} className="font-medium text-ink hover:text-brand">{e.organiser}</Link>
                </p>
              )}
              {!e.businessId && <ClaimLink href={`/claim/events/${e.slug}`}>Organising this? Claim it</ClaimLink>}
            </SideSection>

            {venueName && (
              <SideSection title="Venue">
                {venue ? (
                  <Link href={`/venues/${venue.slug}`} className="font-medium hover:text-brand">{venueName}</Link>
                ) : (
                  <p className="font-medium">{venueName}</p>
                )}
                {address && <p className="text-sm text-harbour/60">{address}</p>}
                {(venue?.guideCopy ?? venue?.summary) && <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-harbour/80">{venue?.guideCopy ?? venue?.summary}</p>}
                <ul className="mt-3 space-y-1 text-sm">
                  {venue?.phone && <li><a href={`tel:${venue.phone.replace(/[^\d+]/g, '')}`} className="hover:text-brand">{venue.phone}</a></li>}
                  {venueSite && <li><a href={venueSite} target="_blank" rel="noopener" className="text-sea hover:text-brand">{printWebsite(venueSite)?.toLowerCase()} ↗</a></li>}
                </ul>
                {directions && <a href={directions} target="_blank" rel="noopener" className={`${secondaryButton} mt-4 block`}>Directions</a>}
                {venue && !venue.businessId && <ClaimLink href={`/claim/venues/${venue.slug}`}>Is this your venue? Claim it</ClaimLink>}
              </SideSection>
            )}

            {atVenue.length > 0 && (
              <SideSection title={`Also at ${venueName ?? 'this venue'}`}>
                <ul className="divide-y divide-harbour/10 text-sm">
                  {atVenue.map(({ event: o }) => (
                    <li key={o.id} className="py-2">
                      <Link href={`/whats-on/${o.slug}`} className="font-medium hover:text-brand">{o.title}</Link>
                      <span className="block text-xs text-harbour/60">{cardWhen(o.dates, o.occurrence, today)}</span>
                    </li>
                  ))}
                </ul>
              </SideSection>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-harbour/10">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <h2 className="mb-5 font-display text-xl font-semibold text-ink">You might also like</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map(({ event: r, venue: v }) => (
                <ListingCard
                  key={r.id}
                  href={`/whats-on/${r.slug}`}
                  title={r.title}
                  when={cardWhen(r.dates, r.occurrence, today)}
                  location={cardLocation(r.venueName ?? v?.name ?? r.venue, r.parish ?? v?.parish)}
                  price={printPrice(r.fromPricePence, r.toPricePence, { free: r.free })}
                  image={r.headerImage}
                  types={r.eventTypes}
                  summary={r.summary ?? r.guideCopy}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}

/** A quiet way in for whoever runs it. */
function ClaimLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mt-4 block text-xs text-harbour/50 underline decoration-harbour/20 underline-offset-2 hover:text-brand hover:decoration-brand">
      {children}
    </Link>
  );
}

function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-brand">{title}</h2>
      {children}
    </section>
  );
}

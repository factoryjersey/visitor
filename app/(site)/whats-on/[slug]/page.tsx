import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Copy, DateList, Facts, Hero, directionsUrl, primaryButton, secondaryButton, timesSummary } from '@/components/site/detail';
import { publicEvent, todayIso } from '@/lib/db/public';
import { printAddress, printPrice, printTimes } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import { upcomingDates, webWhen } from '@/lib/domain/web-dates';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await publicEvent((await params).slug);
  if (!row) return {};
  const e = row.event;
  return {
    title: e.title,
    description: e.summary ?? undefined,
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

  // Structured data, so search results can show the dates and the venue.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    description: e.summary ?? undefined,
    startDate: upcoming[0] ?? e.startsOn ?? undefined,
    endDate: upcoming.at(-1) ?? e.endsOn ?? undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    image: e.headerImage ? [webImage(e.headerImage, 1200, 800)] : undefined,
    location: venueName ? { '@type': 'Place', name: venueName, address: address ?? undefined } : undefined,
    offers: e.fromPricePence !== null ? { '@type': 'Offer', price: (e.fromPricePence / 100).toFixed(2), priceCurrency: 'GBP', url: e.website ?? undefined } : undefined,
  };

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Link href="/whats-on" className="text-sm text-harbour/60 hover:text-coral">← What&apos;s on</Link>
      <header className="mb-6 mt-3">
        {e.highlight && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-coral">Highlight</p>}
        <h1 className="font-serif text-4xl font-bold leading-tight md:text-5xl">{e.title}</h1>
        <p className="mt-2 text-lg font-medium text-sea">{webWhen(e.dates, e.occurrence, today) ?? 'Finished'}</p>
      </header>
      <Hero image={e.headerImage} title={e.title} />
      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Copy lead={e.guideCopy ?? e.summary} body={e.description} />
          <DateList dates={e.dates} today={today} />
        </div>
        <Facts
          rows={[
            ['When', webWhen(e.dates, e.occurrence, today)],
            ['Times', timesSummary(printTimes(e.dates.filter((d) => d.date >= today)))],
            ['Price', price],
            ['Where', venueName && <>{venueName}{address && <span className="block text-harbour/60">{address}</span>}</>],
            ['Contact', e.phone ? <a href={`tel:${e.phone.replace(/[^\d+]/g, '')}`} className="hover:text-coral">{e.phone}</a> : e.email && <a href={`mailto:${e.email}`} className="hover:text-coral">{e.email}</a>],
          ]}
          actions={
            <>
              {e.website && <a href={e.website} target="_blank" rel="noopener" className={primaryButton}>Tickets &amp; information</a>}
              {directions && <a href={directions} target="_blank" rel="noopener" className={secondaryButton}>Directions</a>}
            </>
          }
        />
      </div>
    </article>
  );
}

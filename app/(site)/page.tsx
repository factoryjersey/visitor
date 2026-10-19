import type { Metadata } from 'next';
import Link from 'next/link';
import { alternates } from '@/lib/agents/data';
import { redirect } from 'next/navigation';
import { CategoryMenu } from '@/components/site/category-menu';
import { GuideAd } from '@/components/site/guide-ad';
import { ListingCard, cardLocation } from '@/components/site/listing-card';
import { publicEvents, publicTours, todayIso } from '@/lib/db/public';
import { printPrice } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import { pickLead } from '@/lib/domain/lead';
import { UNIQUE } from '@/lib/domain/occurrence';
import { cardWhen, webWhen } from '@/lib/domain/web-dates';
import { JsonLd } from '@/components/site/json-ld';
import { organisation } from '@/lib/agents/schema-org';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { alternates: alternates('/') };

/** The front page: the lead highlight, what's coming up, and tours on particular dates. */
export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  // A sign-in Supabase sent to the Site URL rather than back to us: finish it.
  const { code } = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);

  const [events, tours] = await Promise.all([publicEvents(), publicTours()]);
  const today = todayIso();
  const lead = pickLead(events, today);
  const otherHighlights = events.filter((r) => r.event.highlight && r !== lead).slice(0, 2);
  const comingUp = events.filter((r) => r !== lead && !r.event.highlight && UNIQUE.includes(r.event.occurrence)).slice(0, 6);
  const datedTours = tours.slice(0, 3);
  // The same tiles as What's on and Tours, each a way in to that page filtered.
  const eventKinds = new Map<string, number>();
  for (const r of events) for (const t of new Set(r.event.eventTypes)) eventKinds.set(t, (eventKinds.get(t) ?? 0) + 1);
  const tourKinds = new Map<string, number>();
  for (const r of tours) if (r.tour.genre) tourKinds.set(r.tour.genre, (tourKinds.get(r.tour.genre) ?? 0) + 1);

  return (
    <>
      <JsonLd data={organisation()} />
      {lead && (
        <section className="relative isolate overflow-hidden bg-harbour text-white">
          {lead.event.headerImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={webImage(lead.event.headerImage, 1920, 900)} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-55" />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-harbour via-harbour/40 to-transparent" />
          <div className="mx-auto flex min-h-[460px] max-w-6xl flex-col justify-end px-4 pb-12 pt-24">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">{lead.event.highlight ? 'Highlight' : 'Coming up'}</p>
            <h1 className="mt-2 max-w-3xl font-display text-3xl font-light leading-tight tracking-tight md:text-5xl">{lead.event.title}</h1>
            <p className="mt-3 text-lg text-white/90">
              {webWhen(lead.event.dates, lead.event.occurrence, today)}
              {(lead.event.venueName ?? lead.venue?.name) && ` · ${lead.event.venueName ?? lead.venue?.name}`}
            </p>
            <div className="mt-6">
              <Link href={`/whats-on/${lead.event.slug}`} className="inline-block rounded bg-brand px-5 py-3 text-sm font-semibold hover:bg-white hover:text-harbour">Find out more</Link>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-6xl px-4 py-12">
        {otherHighlights.length > 0 && (
          <section className="mb-14 grid gap-6 md:grid-cols-2">
            {otherHighlights.map(({ event: e, venue }) => (
              <ListingCard key={e.id} href={`/whats-on/${e.slug}`} title={e.title} when={cardWhen(e.dates, e.occurrence, today)} location={cardLocation(e.venueName ?? venue?.name, e.parish ?? venue?.parish)} image={e.headerImage} types={e.eventTypes} summary={e.summary ?? e.guideCopy} highlight />
            ))}
          </section>
        )}

        <section className="mb-14">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-ink">Unique events coming soon</h2>
            <Link href="/whats-on" className="text-sm font-medium text-sea hover:text-brand">Everything on →</Link>
          </div>
          <CategoryMenu action="/whats-on" values={{}} counts={eventKinds} total={events.length} entry />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {comingUp.map(({ event: e, venue }) => (
              <ListingCard
                key={e.id}
                href={`/whats-on/${e.slug}`}
                title={e.title}
                when={cardWhen(e.dates, e.occurrence, today)}
                location={cardLocation(e.venueName ?? venue?.name ?? e.venue, e.parish ?? venue?.parish)}
                price={printPrice(e.fromPricePence, e.toPricePence, { free: e.free })}
                image={e.headerImage}
                types={e.eventTypes}
                summary={e.summary ?? e.guideCopy}
              />
            ))}
          </div>
        </section>

        <GuideAd />

        {datedTours.length > 0 && (
          <section>
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <h2 className="font-display text-2xl font-semibold text-ink">Tours &amp; experiences</h2>
              <Link href="/tours" className="text-sm font-medium text-sea hover:text-brand">All tours &amp; experiences →</Link>
            </div>
            <CategoryMenu action="/tours" values={{}} counts={tourKinds} total={tours.length} of="tours" entry />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {datedTours.map(({ tour: t, provider }) => (
                <ListingCard
                  key={t.id}
                  href={`/tours/${t.slug}`}
                  title={t.title}
                  when={cardWhen(t.dates, t.occurrence, today)}
                  location={cardLocation(t.meetingPoint, t.parish)}
                  where={[provider?.name, t.duration].filter(Boolean).join(' · ')}
                  price={printPrice(t.fromPricePence, t.toPricePence)}
                  image={t.headerImage}
                  genre={t.genre}
                  summary={t.summary ?? t.guideCopy}
                  tag={t.genre}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

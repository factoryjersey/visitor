import type { Metadata } from 'next';
import { printTitle } from '@/lib/domain/house-style';
import Link from 'next/link';
import { alternates } from '@/lib/agents/data';
import { redirect } from 'next/navigation';
import { CategoryMenu } from '@/components/site/category-menu';
import { GuideAd } from '@/components/site/guide-ad';
import { HeroRotator, type HeroSlide } from '@/components/site/hero-rotator';
import { ListingCard, cardLocation } from '@/components/site/listing-card';
import { publicEvents, publicTours, todayIso } from '@/lib/db/public';
import { HERO_SLIDES, heroPicks, imageKey, isFestival } from '@/lib/domain/hero';
import { printPrice } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import { hiddenByDefault, siteTypes } from '@/lib/domain/categorise';
import { pickLead } from '@/lib/domain/lead';
import { UNIQUE } from '@/lib/domain/occurrence';
import { cardWhen, webWhen } from '@/lib/domain/web-dates';
import { JsonLd } from '@/components/site/json-ld';
import { SubscribePopover } from '@/components/site/subscribe-popover';
import { emailEnabled } from '@/lib/email/send';
import { organisation } from '@/lib/agents/schema-org';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { alternates: alternates('/') };

/** The front page: the lead and other highlights and festivals in rotation, what's on, and tours on particular dates. */
export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  // A sign-in Supabase sent to the Site URL rather than back to us: finish it.
  const { code } = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);

  const [found, tours] = await Promise.all([publicEvents(), publicTours()]);
  // Health listings are for people who live here: off the front page, still behind the Health & wellbeing tile.
  const all = found.map((r) => ({ ...r, event: { ...r.event, eventTypes: siteTypes(r.event) } }));
  const events = all.filter((r) => !hiddenByDefault(r.event));
  const today = todayIso();
  // The lead goes first; highlights and festivals follow, never with its photo again.
  const lead = pickLead(events, today);
  const leadImage = lead?.event.headerImage && imageKey(lead.event.headerImage);
  const rest = events.filter((r) => r !== lead && !(r.event.headerImage && imageKey(r.event.headerImage) === leadImage));
  const hero = lead ? [lead, ...heroPicks(rest, (r) => r.event, HERO_SLIDES - 1)] : heroPicks(events, (r) => r.event);
  const otherHighlights = events.filter((r) => r.event.highlight && !hero.includes(r)).slice(0, 2);
  const comingUp = events.filter((r) => !hero.includes(r) && !r.event.highlight && UNIQUE.includes(r.event.occurrence)).slice(0, 6);
  const slides: HeroSlide[] = hero.map(({ event: e, venue }) => {
    const where = e.venueName ?? venue?.name;
    return {
      key: e.id,
      href: `/whats-on/${e.slug}`,
      title: printTitle(e.title),
      label: e.highlight ? 'Highlight' : isFestival(e) ? 'Festival' : null,
      meta: [webWhen(e.dates, e.occurrence, today), where].filter(Boolean).join(' · ') || null,
      src: webImage(e.headerImage!, 1920, 900),
      alt: e.headerImage!.alt ?? '',
    };
  });
  const datedTours = tours.slice(0, 3);
  // The same tiles as What's on and Tours, each a way in to that page filtered.
  const eventKinds = new Map<string, number>();
  for (const r of all) for (const t of new Set(r.event.eventTypes)) eventKinds.set(t, (eventKinds.get(t) ?? 0) + 1);
  const tourKinds = new Map<string, number>();
  for (const r of tours) if (r.tour.genre) tourKinds.set(r.tour.genre, (tourKinds.get(r.tour.genre) ?? 0) + 1);

  return (
    <>
      <JsonLd data={organisation()} />
      {/* The weekly email, offered once; not while nothing could send its confirmation. */}
      {emailEnabled() && <SubscribePopover />}
      <h1 className="sr-only">What&apos;s on in Jersey</h1>
      <HeroRotator slides={slides} />

      <div className="mx-auto max-w-6xl px-4 py-12">
        {otherHighlights.length > 0 && (
          <section className="mb-14 grid gap-6 md:grid-cols-2">
            {otherHighlights.map(({ event: e, venue }) => (
              <ListingCard key={e.id} href={`/whats-on/${e.slug}`} title={e.title} when={cardWhen(e.dates, e.occurrence, today)} location={cardLocation(e.venueName ?? venue?.name, e.parish ?? venue?.parish)} image={e.headerImage} types={e.eventTypes} summary={e.summary ?? e.guideCopy} highlight />
            ))}
          </section>
        )}

        {comingUp.length > 0 && (
        <section className="mb-14">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-ink">What&apos;s on</h2>
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
        )}

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

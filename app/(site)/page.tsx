import Link from 'next/link';
import { ListingCard } from '@/components/site/listing-card';
import { publicEvents, publicTours, todayIso } from '@/lib/db/public';
import { printPrice } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import { UNIQUE } from '@/lib/domain/occurrence';
import { webWhen } from '@/lib/domain/web-dates';

export const dynamic = 'force-dynamic';

/** The front page: the lead highlight, what's coming up, and tours on particular dates. */
export default async function Home() {
  const [events, tours] = await Promise.all([publicEvents(), publicTours()]);
  const today = todayIso();
  const lead = events.find((r) => r.event.highlight && r.event.headerImage) ?? events.find((r) => r.event.headerImage);
  const otherHighlights = events.filter((r) => r.event.highlight && r !== lead).slice(0, 2);
  const comingUp = events.filter((r) => r !== lead && !r.event.highlight && UNIQUE.includes(r.event.occurrence)).slice(0, 6);
  const datedTours = tours.slice(0, 3);

  return (
    <>
      {lead && (
        <section className="relative isolate overflow-hidden bg-harbour text-white">
          {lead.event.headerImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={webImage(lead.event.headerImage, 1920, 900)} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-55" />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-harbour via-harbour/40 to-transparent" />
          <div className="mx-auto flex min-h-[460px] max-w-6xl flex-col justify-end px-4 pb-12 pt-24">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">{lead.event.highlight ? 'Highlight' : 'Coming up'}</p>
            <h1 className="mt-2 max-w-3xl font-serif text-4xl font-bold leading-tight md:text-6xl">{lead.event.title}</h1>
            <p className="mt-3 text-lg text-white/90">
              {webWhen(lead.event.dates, lead.event.occurrence, today)}
              {(lead.event.venueName ?? lead.venue?.name) && ` · ${lead.event.venueName ?? lead.venue?.name}`}
            </p>
            <div className="mt-6">
              <Link href={`/whats-on/${lead.event.slug}`} className="inline-block rounded bg-coral px-5 py-3 text-sm font-semibold hover:bg-white hover:text-harbour">Find out more</Link>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-6xl px-4 py-12">
        {otherHighlights.length > 0 && (
          <section className="mb-14 grid gap-6 md:grid-cols-2">
            {otherHighlights.map(({ event: e, venue }) => (
              <ListingCard key={e.id} href={`/whats-on/${e.slug}`} title={e.title} when={webWhen(e.dates, e.occurrence, today)} where={e.venueName ?? venue?.name ?? null} image={e.headerImage} highlight />
            ))}
          </section>
        )}

        <section className="mb-14">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 className="font-serif text-3xl font-semibold">Coming up</h2>
            <Link href="/whats-on" className="text-sm font-medium text-sea hover:text-coral">Everything on →</Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {comingUp.map(({ event: e, venue }) => (
              <ListingCard
                key={e.id}
                href={`/whats-on/${e.slug}`}
                title={e.title}
                when={webWhen(e.dates, e.occurrence, today)}
                where={e.venueName ?? venue?.name ?? e.venue}
                price={printPrice(e.fromPricePence, e.toPricePence, { free: e.free })}
                image={e.headerImage}
              />
            ))}
          </div>
        </section>

        {datedTours.length > 0 && (
          <section>
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <h2 className="font-serif text-3xl font-semibold">Tours on particular dates</h2>
              <Link href="/tours" className="text-sm font-medium text-sea hover:text-coral">All tours &amp; experiences →</Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {datedTours.map(({ tour: t, provider }) => (
                <ListingCard
                  key={t.id}
                  href={`/tours/${t.slug}`}
                  title={t.title}
                  when={webWhen(t.dates, t.occurrence, today)}
                  where={[provider?.name, t.duration].filter(Boolean).join(' · ')}
                  price={printPrice(t.fromPricePence, t.toPricePence)}
                  image={t.headerImage}
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

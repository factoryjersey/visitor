import Link from 'next/link';
import { guideSelection } from '@/lib/db/queries';
import { address, eventDatesText, openMonthsText, priceRange } from '@/lib/domain/format';
import { printImage } from '@/lib/domain/images';
import { CATEGORY_LABEL } from '@/lib/params';
import type { Event, Place } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

/** First month an event is on, as a heading: "November 2026". */
function monthOf(e: Event): string {
  if (!e.startsOn) return 'Dates to be confirmed';
  const today = new Date().toISOString().slice(0, 10);
  // A long-running exhibition already open goes under this month, not the month it opened.
  const from = e.startsOn < today ? today : e.startsOn;
  return new Date(`${from.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function group<T>(items: T[], key: (t: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const i of items) m.set(key(i), [...(m.get(key(i)) ?? []), i]);
  return [...m.entries()];
}

/**
 * The selection as it will print: everything marked "In the guide",
 * events by month and venues by section. Print from the browser to A4;
 * images print from the original upload.
 */
export default async function Guide() {
  const { events, venues } = await guideSelection();

  return (
    <article className="mx-auto max-w-[190mm] bg-white p-8 print:p-0">
      <div className="no-print mb-6 flex items-center justify-between rounded bg-stone-100 p-3 text-sm">
        <span>{events.length} events and {venues.length} venues selected.</span>
        <span className="text-stone-500">Print to A4 from the browser to proof.</span>
      </div>

      <h1 className="font-serif text-4xl">What&apos;s on</h1>
      {events.length === 0 && (
        <p className="mt-4 text-stone-500">Nothing selected yet. Choose events on <Link href="/whats-on" className="underline">What&apos;s on</Link>.</p>
      )}
      {group(events, (r) => monthOf(r.event)).map(([month, rows]) => (
        <section key={month} className="mt-6">
          <h2 className="mb-3 border-b border-stone-300 pb-1 font-serif text-2xl">{month}</h2>
          <div className="space-y-4">
            {rows.map(({ event: e, venue }) => <EventEntry key={e.id} e={e} venue={venue} />)}
          </div>
        </section>
      ))}

      {venues.length > 0 && (
        <div className="page-break mt-10">
          <h1 className="font-serif text-4xl">Venues</h1>
          {group(venues, (p) => CATEGORY_LABEL[p.category]).map(([section, ps]) => (
            <section key={section} className="mt-6">
              <h2 className="mb-3 border-b border-stone-300 pb-1 font-serif text-2xl">{section}</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {ps.map((p) => <VenueEntry key={p.id} p={p} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </article>
  );
}

function EventEntry({ e, venue }: { e: Event; venue: Place | null }) {
  return (
    <div className="avoid-break grid grid-cols-[1fr_45mm] gap-4">
      <div>
        <h3 className="font-serif text-lg font-semibold">{e.title}</h3>
        <p className="text-sm font-medium">{eventDatesText(e.dates)}</p>
        <p className="text-sm text-stone-600">
          {venue?.name ?? e.venue}
          {priceRange(e.fromPricePence, e.toPricePence) && ` · ${priceRange(e.fromPricePence, e.toPricePence)}`}
        </p>
        {(e.guideCopy ?? e.summary) && <p className="mt-1 text-sm">{e.guideCopy ?? e.summary}</p>}
      </div>
      {e.headerImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={printImage(e.headerImage)} alt="" className="h-[30mm] w-[45mm] object-cover" />
      )}
    </div>
  );
}

function VenueEntry({ p }: { p: Place }) {
  return (
    <div className="avoid-break text-sm">
      <h3 className="font-serif text-base font-semibold">{p.name}</h3>
      <p className="text-stone-600">{address(p)}</p>
      {(p.guideCopy ?? p.summary) && <p className="mt-1">{p.guideCopy ?? p.summary}</p>}
      <p className="mt-1 text-stone-600">
        {[p.phone, p.website?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), openMonthsText(p.openMonths)].filter(Boolean).join(' · ')}
      </p>
    </div>
  );
}

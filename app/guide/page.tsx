import Link from 'next/link';
import type { GuideEvent, GuideVenue } from '@/lib/domain/guide-entry';
import { buildGuide, windowFrom } from '@/lib/guide';
import { one, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';

function group<T>(items: T[], key: (t: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const i of items) m.set(key(i), [...(m.get(key(i)) ?? []), i]);
  return [...m.entries()];
}

/**
 * The selection as the guide prints it: the pocket page (115 × 165mm),
 * entries in the printed field order, built by the same code as the
 * InDesign export. This is the proof; the export is what gets merged.
 */
export default async function Guide({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const window = windowFrom({ from: one(sp.from), to: one(sp.to) });
  const { events, venues } = await buildGuide(window);
  const qs = `from=${window.from}&to=${window.to}`;

  return (
    <>
      <form action="/guide" className="no-print mb-6 flex flex-wrap items-end gap-3 rounded border border-stone-200 bg-white p-3 text-sm">
        <label className="flex flex-col">
          <span className="text-xs text-stone-500">Edition from</span>
          <input type="date" name="from" defaultValue={window.from} className="rounded border border-stone-300 px-2 py-1" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-stone-500">to</span>
          <input type="date" name="to" defaultValue={window.to} className="rounded border border-stone-300 px-2 py-1" />
        </label>
        <button type="submit" className="rounded bg-stone-900 px-3 py-1 text-white">Show</button>
        <span className="ml-auto text-stone-600">{events.length} events · {venues.length} venues</span>
        <a href={`/guide/export/whats-on.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">What&apos;s On for InDesign</a>
        <a href={`/guide/export/venues.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">Venues for InDesign</a>
      </form>

      <div className="guide-pages">
        <section className="guide-page">
          <h2 className="guide-tab">Events this season</h2>
          {events.length === 0 && (
            <p className="guide-empty no-print">Nothing selected for these dates. Choose events on <Link href="/whats-on">What&apos;s on</Link>.</p>
          )}
          <div className="guide-columns">
            {events.map((e) => <EventEntry key={e.title + e.sortKey} e={e} />)}
          </div>
        </section>

        {group(venues, (v) => v.section).map(([section, inSection]) => (
          <section key={section} className="guide-page">
            <h2 className="guide-tab">{section}</h2>
            {group(inSection, (v) => v.area).map(([area, inArea]) => (
              <div key={area}>
                {area && <h3 className="guide-area">{section} {area}</h3>}
                <div className="guide-columns">
                  {inArea.map((v) => <VenueEntry key={v.name} v={v} />)}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}

function EventEntry({ e }: { e: GuideEvent }) {
  return (
    <article className="guide-entry">
      <p className="guide-when">{e.dates}{e.times && <span>{e.times}</span>}</p>
      <h4 className="guide-title">{e.title}</h4>
      <p>{e.copy} {e.price && <strong>{e.price}</strong>}</p>
      <p className="guide-venue">{e.venue}</p>
      {e.address && <p>{e.address}</p>}
      {e.contact && <p>{e.contact}</p>}
      {e.website && <p className="guide-web">{e.website}</p>}
    </article>
  );
}

function VenueEntry({ v }: { v: GuideVenue }) {
  return (
    <article className="guide-entry">
      <h4 className="guide-title">{v.name}</h4>
      {v.label && <p className="guide-label">{v.label}</p>}
      {v.copy && <p>{v.copy}</p>}
      {v.address && <p>{v.address}</p>}
      {v.phone && <p>{v.phone}</p>}
      {v.size !== 'directory' && v.website && <p className="guide-web">{v.website}</p>}
    </article>
  );
}

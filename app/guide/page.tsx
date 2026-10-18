import Link from 'next/link';
import type { GuideEvent, GuideTour, GuideVenue } from '@/lib/domain/guide-entry';
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
  const { events, tours, providers, venues } = await buildGuide(window);
  const allSeason = events.filter((e) => e.block === 'all season');
  const dated = events.filter((e) => e.block === 'dated');
  const datedTours = tours.filter((t) => t.kind === 'dated');
  const onDemand = tours.filter((t) => t.kind === 'on demand');
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
        <span className="ml-auto text-stone-600">{events.length} events · {tours.length} tours · {venues.length} venues</span>
        <span className="flex w-full flex-wrap justify-end gap-2">
          <span className="self-center text-xs text-stone-500">For InDesign:</span>
          <a href={`/guide/export/whats-on.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">What&apos;s On</a>
          <a href={`/guide/export/tours.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">Tours</a>
          <a href={`/guide/export/providers.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">Tour providers</a>
          <a href={`/guide/export/venues.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">Venues</a>
        </span>
      </form>

      <div className="guide-pages">
        <section className="guide-page">
          <h2 className="guide-tab">Events this season</h2>
          {events.length === 0 && (
            <p className="guide-empty no-print">Nothing selected for these dates. Choose events on <Link href="/whats-on">What&apos;s on</Link>.</p>
          )}
          {allSeason.length > 0 && (
            <>
              <h3 className="guide-area">On all season</h3>
              <div className="guide-columns">
                {allSeason.map((e) => <EventEntry key={e.title + e.sortKey} e={e} />)}
              </div>
              {dated.length > 0 && <h3 className="guide-area">Dates for the diary</h3>}
            </>
          )}
          <div className="guide-columns">
            {dated.map((e) => <EventEntry key={e.title + e.sortKey} e={e} />)}
          </div>
        </section>

        {tours.length > 0 && (
          <section className="guide-page">
            <h2 className="guide-tab">Walks and tours</h2>
            <h3 className="guide-area">Tour guides &amp; providers</h3>
            <div className="guide-key">
              {providers.map((p) => (
                <p key={p.name}><strong>{p.code || '??'}</strong> {p.name} {p.contact} {p.website}</p>
              ))}
            </div>
            {datedTours.length > 0 && (
              <>
                <h3 className="guide-area">Tours &amp; experiences on these dates</h3>
                <div className="guide-columns">{datedTours.map((t) => <TourEntry key={t.title} t={t} />)}</div>
              </>
            )}
            {group(onDemand, (t) => t.genre || 'Other').map(([genre, ts]) => (
              <div key={genre}>
                <h3 className="guide-area">On demand: {genre.toLowerCase()}</h3>
                <div className="guide-columns">{ts.map((t) => <TourEntry key={t.title} t={t} />)}</div>
              </div>
            ))}
          </section>
        )}

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

function TourEntry({ t }: { t: GuideTour }) {
  return (
    <article className="guide-entry">
      {t.dates && <p className="guide-when">{t.dates}</p>}
      <p>
        <strong>{t.title}</strong> <strong>{t.code || '??'}</strong> {t.duration}{t.times && `, ${t.times}`} {t.copy}
      </p>
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

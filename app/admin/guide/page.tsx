import Link from 'next/link';
import type { GuideEvent, GuideTour, GuideVenue } from '@/lib/domain/guide-entry';
import { includeDraft } from '@/app/actions';
import { buildGuide, editions, isDraft, windowFrom } from '@/lib/guide';
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
  // A draft lays out everything eligible; with nothing chosen yet, it is where the page starts.
  const asked = one(sp.draft);
  let draft = isDraft(asked);
  let guide = await buildGuide(window, { draft });
  if (asked === undefined && !draft && !guide.events.length && !guide.tours.length && !guide.highlights.length) {
    draft = true;
    guide = await buildGuide(window, { draft });
  }
  const { highlights, events, tours, providers, venues } = guide;
  const allSeason = events.filter((e) => e.block === 'all season');
  const dated = events.filter((e) => e.block === 'dated');
  const datedTours = tours.filter((t) => t.kind === 'dated');
  const onDemand = tours.filter((t) => t.kind === 'on demand');
  const qs = `from=${window.from}&to=${window.to}${draft ? '&draft=1' : ''}`;
  const year = Number(window.from.slice(0, 4));
  const presets = [...editions(year - 1).slice(3), ...editions(year), ...editions(year + 1).slice(0, 2)];
  const href = (w: { from: string; to: string }, d = draft) => `/admin/guide?from=${w.from}&to=${w.to}&draft=${d ? 1 : 0}`;
  const pill = (active: boolean) => `rounded-full border px-3 py-1 ${active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 hover:bg-stone-100'}`;

  return (
    <>
      <div className="no-print mb-6 space-y-3 rounded border border-stone-200 bg-white p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-500">Edition</span>
          {presets.map((p) => (
            <Link key={p.name} href={href(p.window)} className={pill(p.window.from === window.from && p.window.to === window.to)}>{p.name}</Link>
          ))}
        </div>
        <form action="/admin/guide" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="draft" value={draft ? '1' : '0'} />
          <label className="flex flex-col">
            <span className="text-xs text-stone-500">From</span>
            <input type="date" name="from" defaultValue={window.from} className="rounded border border-stone-300 px-2 py-1" />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-stone-500">to</span>
            <input type="date" name="to" defaultValue={window.to} className="rounded border border-stone-300 px-2 py-1" />
          </label>
          <button type="submit" className="rounded bg-stone-900 px-3 py-1 text-white">Show</button>
          <span className="ml-auto flex gap-1">
            <Link href={href(window, false)} className={pill(!draft)}>Selected</Link>
            <Link href={href(window, true)} className={pill(draft)}>Draft: everything eligible</Link>
          </span>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-stone-600">{highlights.length} highlights · {events.length} events · {tours.length} tours · {venues.length} venues</span>
          <span className="ml-auto self-center text-xs text-stone-500">For InDesign:</span>
          <a href={`/admin/guide/export/highlights.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">Highlights</a>
          <a href={`/admin/guide/export/whats-on.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">What&apos;s On</a>
          <a href={`/admin/guide/export/tours.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">Tours</a>
          <a href={`/admin/guide/export/providers.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">Tour providers</a>
          <a href={`/admin/guide/export/venues.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">Venues</a>
        </div>
        {draft && (
          <div className="flex flex-wrap items-center gap-3 rounded bg-amber-50 px-3 py-2 text-amber-900">
            <p className="mr-auto">
              <strong>Draft.</strong> Every approved event and tour on in these dates that nobody has left out, business events aside. Leave out what should not print from
              {' '}<Link href="/admin/whats-on" className="underline">What&apos;s on</Link>, then make the rest the selection:
            </p>
            {(['events', 'tours'] as const).map((what) => (
              <form key={what} action={includeDraft}>
                <input type="hidden" name="from" value={window.from} />
                <input type="hidden" name="to" value={window.to} />
                <input type="hidden" name="what" value={what} />
                <button type="submit" className="rounded border border-amber-300 bg-white px-3 py-1 hover:bg-amber-100">Include all {what} shown</button>
              </form>
            ))}
          </div>
        )}
      </div>

      <div className="guide-pages">
        {highlights.map((e) => <HighlightPage key={e.title} e={e} />)}
        <section className="guide-page">
          <h2 className="guide-tab">Events this season</h2>
          {events.length === 0 && (
            <p className="guide-empty no-print">Nothing selected for these dates. Choose events on <Link href="/admin/whats-on">What&apos;s on</Link>.</p>
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

/** A highlight's full page: the large image, then the extended listing. Images print from the original upload. */
function HighlightPage({ e }: { e: GuideEvent }) {
  return (
    <section className="guide-page guide-highlight">
      <h2 className="guide-tab">Highlight</h2>
      {e.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.imageUrl} alt="" className="guide-highlight-image" />
      )}
      <p className="guide-when">{e.dates}{e.times && <span>{e.times}</span>}</p>
      <h3 className="guide-highlight-title">{e.title}</h3>
      <div className="guide-highlight-copy">
        {e.extendedCopy.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
      </div>
      <p className="mt-2">{e.price && <strong>{e.price}</strong>}</p>
      <p className="guide-venue">{e.venue}</p>
      {e.address && <p>{e.address}</p>}
      {e.contact && <p>{e.contact}</p>}
      {e.website && <p className="guide-web">{e.website}</p>}
    </section>
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

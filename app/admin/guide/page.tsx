import '@fontsource/barlow-semi-condensed/400.css';
import '@fontsource/barlow-semi-condensed/500.css';
import '@fontsource/barlow-semi-condensed/500-italic.css';
import '@fontsource/barlow-semi-condensed/600.css';
import '@fontsource/barlow-semi-condensed/600-italic.css';
import '@fontsource/barlow-semi-condensed/700.css';
import Link from 'next/link';
import { GuideBook } from '@/components/guide/book';
import { layoutFrom, type GuideVenue } from '@/lib/domain/guide-entry';
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
  const layout = layoutFrom(one(sp.grid));
  let draft = isDraft(asked);
  let guide = await buildGuide(window, { draft, layout });
  if (asked === undefined && !draft && !guide.events.length && !guide.tours.length && !guide.highlights.length) {
    draft = true;
    guide = await buildGuide(window, { draft, layout });
  }
  const { highlights, events, pages, tours, tourPages, providers, venues, leftOut } = guide;
  const listed = events.filter((e) => e.frame !== 'image').length;
  const qs = `from=${window.from}&to=${window.to}${draft ? '&draft=1' : ''}${layout === 'top' ? '' : `&grid=${layout}`}`;
  const year = Number(window.from.slice(0, 4));
  // Where What's On starts in the printed guide; the 2026 editions open it on page 36.
  const firstPage = Math.max(1, Math.min(400, Number(one(sp.page)) || 36));
  const presets = [...editions(year - 1).slice(3), ...editions(year), ...editions(year + 1).slice(0, 2)];
  const href = (w: { from: string; to: string }, d = draft, g = layout) => `/admin/guide?from=${w.from}&to=${w.to}&draft=${d ? 1 : 0}${g === 'top' ? '' : `&grid=${g}`}`;
  const layouts = [['top', 'Pictures on top'], ['grid6', 'Grid of 6'], ['grid8', 'Grid of 8']] as const;
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
          {layout !== 'top' && <input type="hidden" name="grid" value={layout} />}
          <label className="flex flex-col">
            <span className="text-xs text-stone-500">From</span>
            <input type="date" name="from" defaultValue={window.from} className="rounded border border-stone-300 px-2 py-1" />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-stone-500">to</span>
            <input type="date" name="to" defaultValue={window.to} className="rounded border border-stone-300 px-2 py-1" />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-stone-500">First page</span>
            <input type="number" name="page" min={1} max={400} defaultValue={firstPage} className="w-20 rounded border border-stone-300 px-2 py-1" />
          </label>
          <button type="submit" className="rounded bg-stone-900 px-3 py-1 text-white">Show</button>
          <span className="ml-auto flex gap-1">
            <Link href={href(window, false)} className={pill(!draft)}>Selected</Link>
            <Link href={href(window, true)} className={pill(draft)}>Draft: everything eligible</Link>
          </span>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-500">Events layout</span>
          {layouts.map(([g, label]) => <Link key={g} href={href(window, draft, g)} className={pill(layout === g)}>{label}</Link>)}
          {layout !== 'top' && <span className="text-xs text-stone-500">Walks and tours go on the grid of eight too. Each page&apos;s picture box shows the event or tour ticked &lsquo;Use its picture in the guide grid&rsquo;, else the first with its own photograph.</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-stone-600">{highlights.length} highlights · {listed} events · {pages.length} event pages{tourPages ? ` · ${tourPages.length} tour pages` : ''} · {tours.filter((t) => t.frame !== 'image').length} tours · {venues.length} venues</span>
          <span className="ml-auto self-center text-xs text-stone-500">For InDesign:</span>
          <a href={`/admin/guide/export/highlights.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">Highlights</a>
          <a href={`/admin/guide/export/whats-on.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">What&apos;s On</a>
          <a href={`/admin/guide/export/tours.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">Tours</a>
          <a href={`/admin/guide/export/providers.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">Tour providers</a>
          <a href={`/admin/guide/export/venues.csv?${qs}`} className="rounded border border-stone-300 px-3 py-1 hover:bg-stone-100">Venues</a>
        </div>
        {leftOut.length > 0 && (
          <details className="text-xs text-stone-600">
            <summary className="cursor-pointer">{leftOut.length} events left out of print as not aimed at visitors: training and work, business, and health and wellbeing</summary>
            <p className="mt-1">{leftOut.join(' · ')}</p>
            <p className="mt-1 text-stone-500">To print one, set its kinds by hand on its page: without Professional &amp; training or Business &amp; networking, and with Health &amp; wellbeing only alongside something visitors come for.</p>
          </details>
        )}
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

      {events.length === 0 && tours.length === 0 && highlights.length === 0 && (
        <p className="guide-empty no-print">Nothing selected for these dates. Choose events on <Link href="/admin/whats-on">What&apos;s on</Link>, or look at the draft.</p>
      )}
      <GuideBook key={`${window.from}-${window.to}-${draft}-${firstPage}-${layout}`} highlights={highlights} events={events} pages={pages} layout={layout} tours={tours} tourGrid={tourPages} providers={providers} venues={venues} firstPage={firstPage} />

      <div className="guide-pages mt-8">
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

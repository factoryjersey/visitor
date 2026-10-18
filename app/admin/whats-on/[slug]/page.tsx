import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DecidedBy } from '@/components/decided-by';
import { EditorialForm } from '@/components/editorial-form';
import { EventPrintForm } from '@/components/event-print-form';
import { HighlightControl } from '@/components/highlight-control';
import { InclusionBadge, InclusionControl } from '@/components/inclusion';
import { OccurrenceControl } from '@/components/occurrence';
import { SourcePanel } from '@/components/source-panel';
import { VenuePicker } from '@/components/venue-picker';
import { getEvent, placesNear } from '@/lib/db/queries';
import { dayText, eventDatesText } from '@/lib/domain/format';
import { webImage } from '@/lib/domain/images';
import { guideEvent } from '@/lib/domain/guide-entry';
import { printDates, printPrice, printTimes } from '@/lib/domain/house-style';
import { windowFrom } from '@/lib/guide';

export const dynamic = 'force-dynamic';

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const row = await getEvent((await params).slug);
  if (!row) notFound();
  const { event: e, venue } = row;
  // The coming edition, so the preview prints the dates the guide would.
  const window = windowFrom({});
  const entry = guideEvent(e, venue, window);
  const computed = {
    dates: printDates(e.dates, window),
    times: printTimes(e.dates),
    price: printPrice(e.fromPricePence, e.toPricePence, { free: e.free }),
  };
  const nearby = e.lat !== null && e.lon !== null ? await placesNear(e.lat, e.lon) : [];
  // Keep the current venue selectable even if it is not among the nearest.
  const options = venue && !nearby.some((n) => n.id === venue.id) ? [{ id: venue.id, name: venue.name, metres: NaN }, ...nearby] : nearby;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Link href="/admin/whats-on" className="text-sm text-stone-500 hover:underline">← What&apos;s on</Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-3xl">{e.title}</h1>
          <InclusionBadge inclusion={e.inclusion} />
        </div>
        {e.headerImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={webImage(e.headerImage, 1200, 600)} alt="" className="w-full rounded" />
        )}
        <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
          <dt className="text-stone-500">When</dt><dd>{eventDatesText(e.dates) ?? '—'}</dd>
          <dt className="text-stone-500">Where</dt>
          <dd>{venue ? <Link href={`/admin/venues/${venue.slug}`} className="hover:underline">{venue.name}</Link> : e.venue ?? '—'}</dd>
          <dt className="text-stone-500">Price</dt><dd>{printPrice(e.fromPricePence, e.toPricePence, { free: e.free }) ?? '—'}</dd>
        </dl>
        {e.summary && <p className="text-stone-700">{e.summary}</p>}
        {e.description && <div className="whitespace-pre-line text-sm text-stone-600">{e.description}</div>}
        {e.dates.length > 1 && e.dates.length <= 40 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-stone-500">All {e.dates.length} dates</summary>
            <ul className="mt-2 columns-2">
              {e.dates.map((d) => <li key={d.date + d.start}>{dayText(d.date)}{d.start && `, ${d.start}`}{d.end && `–${d.end}`}</li>)}
            </ul>
          </details>
        )}
      </div>
      <aside className="space-y-4">
        <div className="rounded border border-stone-200 bg-white p-3">
          <h2 className="mb-2 text-sm font-medium">In the guide?</h2>
          <InclusionControl kind="event" id={e.id} inclusion={e.inclusion} />
          <div className="my-3 border-t border-stone-100 pt-3"><HighlightControl kind="event" id={e.id} highlight={e.highlight} /></div>
          <DecidedBy inclusion={e.inclusion} by={e.inclusionSetBy} at={e.inclusionSetAt} editedBy={e.editedBy} editedAt={e.editedAt} />
        </div>
        <div className="rounded border border-stone-200 bg-white p-3">
          <OccurrenceControl kind="event" id={e.id} occurrence={e.occurrence} locked={e.lockedFields.includes('occurrence')} />
        </div>
        {(options.length > 0 || venue) && (
          <div className="rounded border border-stone-200 bg-white p-3">
            <VenuePicker eventId={e.id} currentId={e.placeId} locked={e.lockedFields.includes('placeId')} options={options} />
          </div>
        )}
        <div className="rounded border border-stone-200 bg-white p-3">
          <EditorialForm kind="event" id={e.id} guideCopy={e.guideCopy} inclusionNote={e.inclusionNote} sourceCopy={e.summary} />
        </div>
        <div className="rounded border border-stone-200 bg-white p-3">
          <EventPrintForm id={e.id} entry={entry} computed={computed} current={{ dates: e.printDates, times: e.printTimes, price: e.printPrice }} />
        </div>
        <SourcePanel sourceLink={e.sourceLink} sourceModifiedAt={e.sourceModifiedAt} fieldSources={e.fieldSources} />
      </aside>
    </div>
  );
}

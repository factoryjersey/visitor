import Link from 'next/link';
import { notFound } from 'next/navigation';
import { saveTourPrint } from '@/app/actions';
import { BusinessControl } from '@/components/business-control';
import { DecidedBy } from '@/components/decided-by';
import { EditorialForm } from '@/components/editorial-form';
import { GenreControl } from '@/components/genre-control';
import { HighlightControl } from '@/components/highlight-control';
import { InclusionBadge, InclusionControl } from '@/components/inclusion';
import { OccurrenceControl } from '@/components/occurrence';
import { SourcePanel } from '@/components/source-panel';
import { getExperience } from '@/lib/db/queries';
import { guideTour } from '@/lib/domain/guide-entry';
import { printPrice, printTimes, printTourDates } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import { windowFrom } from '@/lib/guide';

export const dynamic = 'force-dynamic';

export default async function TourPage({ params }: { params: Promise<{ slug: string }> }) {
  const row = await getExperience((await params).slug);
  if (!row) notFound();
  const { experience: x, provider } = row;
  const window = windowFrom({});
  const entry = guideTour(x, provider, window);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = x.dates.filter((d) => d.date >= today);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Link href="/admin/tours" className="text-sm text-stone-500 hover:underline">← Tours &amp; experiences</Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-3xl">{x.title}</h1>
          <InclusionBadge inclusion={x.inclusion} />
        </div>
        {x.headerImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={webImage(x.headerImage, 1200, 600)} alt="" className="w-full rounded" />
        )}
        <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
          <dt className="text-stone-500">Provider</dt>
          <dd>{provider ? <>{provider.code && <strong className="mr-1">{provider.code}</strong>}{provider.name}</> : '—'}</dd>
          <dt className="text-stone-500">Dates ahead</dt>
          <dd>{upcoming.length === 0 ? 'None' : upcoming.length > 20 ? `${upcoming.length} bookable dates, ${printTourDates([upcoming[0]!])} to ${printTourDates([upcoming.at(-1)!])}` : printTourDates(upcoming)}</dd>
          <dt className="text-stone-500">Duration</dt><dd>{x.duration ?? '—'}</dd>
          <dt className="text-stone-500">Price</dt><dd>{printPrice(x.fromPricePence, x.toPricePence) ?? '—'}</dd>
          <dt className="text-stone-500">Meeting point</dt><dd>{x.meetingPoint ?? '—'}</dd>
          <dt className="text-stone-500">Their tags</dt><dd className="text-stone-500">{x.tags.join(', ') || '—'}</dd>
        </dl>
        {x.summary && <p className="text-stone-700">{x.summary}</p>}
        {x.description && <div className="whitespace-pre-line text-sm text-stone-600">{x.description}</div>}
      </div>
      <aside className="space-y-4">
        <div className="rounded border border-stone-200 bg-white p-3">
          <h2 className="mb-2 text-sm font-medium">In the guide?</h2>
          {x.review === 'approved' ? <InclusionControl kind="experience" id={x.id} inclusion={x.inclusion} /> : <p className="text-xs text-stone-500">Once approved in Review.</p>}
          <div className="my-3 border-t border-stone-100 pt-3"><HighlightControl kind="experience" id={x.id} highlight={x.highlight} /></div>
          <DecidedBy inclusion={x.inclusion} by={x.inclusionSetBy} at={x.inclusionSetAt} editedBy={x.editedBy} editedAt={x.editedAt} />
        </div>
        <div className="space-y-3 rounded border border-stone-200 bg-white p-3">
          <OccurrenceControl kind="experience" id={x.id} occurrence={x.occurrence} locked={x.lockedFields.includes('occurrence')} onDemand />
          <GenreControl id={x.id} genre={x.genre} locked={x.lockedFields.includes('genre')} />
        </div>
        <div className="space-y-3 rounded border border-stone-200 bg-white p-3">
          <h2 className="text-sm font-medium">In print</h2>
          {entry ? (
            <div className="guide-page !min-h-0 !w-full !p-3 !shadow-none ring-1 ring-stone-200">
              <article className="guide-entry !mb-0">
                <p>
                  {entry.dates && <strong className="mr-1">{entry.dates}</strong>}
                  <strong>{entry.title}</strong> <strong>{entry.code}</strong> {entry.duration}{entry.times && ` ${entry.times}`} {entry.copy}
                </p>
                <p className="mt-1 text-[6.5pt] uppercase text-stone-500">{entry.kind === 'dated' ? 'Dated listing' : `On demand · ${entry.genre || 'no genre'}`}</p>
              </article>
            </div>
          ) : <p className="text-xs text-stone-500">Nothing to print in the coming edition.</p>}
          <form action={saveTourPrint} className="space-y-2">
            <input type="hidden" name="id" value={x.id} />
            <label className="block">
              <span className="text-xs text-stone-500">Dates</span>
              <input name="printDates" defaultValue={x.printDates ?? ''} placeholder={printTourDates(x.dates, window) ?? ''} className="mt-0.5 w-full rounded border border-stone-300 p-1.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-stone-500">Times</span>
              <input name="printTimes" defaultValue={x.printTimes ?? ''} placeholder={printTimes(x.dates) ?? ''} className="mt-0.5 w-full rounded border border-stone-300 p-1.5 text-sm" />
            </label>
            <button type="submit" className="rounded border border-stone-300 px-3 py-1 text-sm hover:bg-stone-100">Save print details</button>
          </form>
        </div>
        <div className="rounded border border-stone-200 bg-white p-3">
          <EditorialForm kind="experience" id={x.id} guideCopy={x.guideCopy} inclusionNote={x.inclusionNote} sourceCopy={x.summary} />
        </div>
        <BusinessControl kind="experience" id={x.id} businessId={x.businessId} review={x.review} />
        <SourcePanel sourceLink={x.sourceLink} sourceModifiedAt={x.sourceModifiedAt} fieldSources={x.fieldSources} />
      </aside>
    </div>
  );
}

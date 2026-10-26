import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BusinessControl } from '@/components/business-control';
import { DecidedBy } from '@/components/decided-by';
import { EditorialForm } from '@/components/editorial-form';
import { InclusionBadge, InclusionControl } from '@/components/inclusion';
import { SourcePanel } from '@/components/source-panel';
import { VenueGuideForm } from '@/components/venue-guide-form';
import { VenueTagsForm } from '@/components/venue-tags-form';
import { GooglePlaceForm } from '@/components/google-place-form';
import { guideVenue } from '@/lib/domain/guide-entry';
import { getVenue } from '@/lib/db/queries';
import { address, eventDatesText, openMonthsText, rateRange } from '@/lib/domain/format';
import { webImage } from '@/lib/domain/images';
import { CATEGORY_LABEL } from '@/lib/params';

export const dynamic = 'force-dynamic';

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const found = await getVenue((await params).slug);
  if (!found) notFound();
  const { place: p, events } = found;

  const facts: [string, string | null][] = [
    ['Section', CATEGORY_LABEL[p.category]],
    ['Address', address(p) || null],
    ['Phone', p.phone],
    ['Website', p.website],
    ['Email', p.email],
    ['Open', openMonthsText(p.openMonths)],
    ['Rates', rateRange(p.lowRatePence, p.highRatePence)],
    ['Rating', p.aaRating],
    ['Facilities', p.facilities.join(', ') || null],
    ['Accessibility', p.accessibility.join(', ') || null],
  ];

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Link href="/admin/venues" className="text-sm text-stone-500 hover:underline">← Venues</Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-3xl">{p.name}</h1>
          <div className="flex shrink-0 gap-1.5">
            {p.recommendedIn && <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Recommended</span>}
            {p.client && <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Client</span>}
            <InclusionBadge inclusion={p.inclusion} />
          </div>
        </div>
        {p.headerImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={webImage(p.headerImage, 1200, 600)} alt="" className="w-full rounded" />
        )}
        <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-stone-500">{k}</dt><dd className="break-words">{v}</dd></div>
          ))}
        </dl>
        {p.summary && <p className="text-stone-700">{p.summary}</p>}
        {p.description && <div className="whitespace-pre-line text-sm text-stone-600">{p.description}</div>}
        {events.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-xl">Events here</h2>
            <ul className="divide-y divide-stone-200 rounded border border-stone-200 bg-white text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 p-2">
                  <div>
                    <Link href={`/admin/whats-on/${e.slug}`} className="hover:underline">{e.title}</Link>
                    <div className="text-stone-500">{eventDatesText(e.dates)}</div>
                  </div>
                  <InclusionBadge inclusion={e.inclusion} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <aside className="space-y-4">
        <div className="rounded border border-stone-200 bg-white p-3">
          <h2 className="mb-2 text-sm font-medium">In the guide?</h2>
          {p.review === 'approved' ? <InclusionControl kind="venue" id={p.id} inclusion={p.inclusion} /> : <p className="text-xs text-stone-500">Once approved in Review.</p>}
          <DecidedBy inclusion={p.inclusion} by={p.inclusionSetBy} at={p.inclusionSetAt} editedBy={p.editedBy} editedAt={p.editedAt} />
        </div>
        <div className="rounded border border-stone-200 bg-white p-3">
          <EditorialForm kind="venue" id={p.id} guideCopy={p.guideCopy} inclusionNote={p.inclusionNote} sourceCopy={p.summary} />
        </div>
        <div className="rounded border border-stone-200 bg-white p-3">
          <VenueGuideForm id={p.id} section={p.guideSection} defaultSection={guideVenue({ ...p, guideSection: null }).section} area={p.guideArea} label={p.guideLabel} size={p.listingSize} />
        </div>
        <div className="rounded border border-stone-200 bg-white p-3">
          <VenueTagsForm id={p.id} recommendedIn={p.recommendedIn} client={p.client} clientNote={p.clientNote} />
        </div>
        <div className="rounded border border-stone-200 bg-white p-3">
          <GooglePlaceForm id={p.id} placeId={p.googlePlaceId} locked={p.googleLocked} checkedAt={p.googleCheckedAt} />
        </div>
        <BusinessControl kind="venue" id={p.id} businessId={p.businessId} review={p.review} />
        <SourcePanel sourceLink={p.sourceLink} sourceModifiedAt={p.sourceModifiedAt} fieldSources={p.fieldSources} />
      </aside>
    </div>
  );
}

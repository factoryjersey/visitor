import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EditorialForm } from '@/components/editorial-form';
import { InclusionBadge, InclusionControl } from '@/components/inclusion';
import { SourcePanel } from '@/components/source-panel';
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
        <Link href="/venues" className="text-sm text-stone-500 hover:underline">← Venues</Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-3xl">{p.name}</h1>
          <InclusionBadge inclusion={p.inclusion} />
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
            <h2 className="mb-2 font-serif text-xl">Events here</h2>
            <ul className="divide-y divide-stone-200 rounded border border-stone-200 bg-white text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 p-2">
                  <div>
                    <Link href={`/whats-on/${e.slug}`} className="hover:underline">{e.title}</Link>
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
          <InclusionControl kind="venue" id={p.id} inclusion={p.inclusion} />
        </div>
        <div className="rounded border border-stone-200 bg-white p-3">
          <EditorialForm kind="venue" id={p.id} guideCopy={p.guideCopy} inclusionNote={p.inclusionNote} sourceCopy={p.summary} />
        </div>
        <SourcePanel sourceLink={p.sourceLink} sourceModifiedAt={p.sourceModifiedAt} fieldSources={p.fieldSources} />
      </aside>
    </div>
  );
}

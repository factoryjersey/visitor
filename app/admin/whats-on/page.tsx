import Link from 'next/link';
import { Filters, INCLUSION_OPTIONS } from '@/components/filters';
import { InclusionBadge, InclusionControl } from '@/components/inclusion';
import { OccurrenceBadge } from '@/components/occurrence';
import { listEvents } from '@/lib/db/queries';
import { eventDatesText, priceRange } from '@/lib/domain/format';
import { webImage } from '@/lib/domain/images';
import { asInclusion, occurrencesFrom, one, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';

function monthOptions() {
  const now = new Date();
  return Array.from({ length: 15 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    return {
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    };
  });
}

export default async function WhatsOn({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const values = { q: one(sp.q), inclusion: one(sp.inclusion), month: one(sp.month), regular: one(sp.regular), ongoing: one(sp.ongoing) };
  const rows = await listEvents({
    q: values.q,
    inclusion: asInclusion(values.inclusion),
    month: values.month,
    occurrences: occurrencesFrom(values),
  });
  const included = rows.filter((r) => r.event.inclusion === 'included').length;

  return (
    <>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="font-display text-2xl">What&apos;s on</h1>
        <p className="text-sm text-stone-500">{rows.length} events · {included} in the guide</p>
      </div>
      <Filters
        action="/admin/whats-on"
        values={values}
        selects={[
          { name: 'month', label: 'On during', options: monthOptions() },
          { name: 'inclusion', label: 'Status', options: INCLUSION_OPTIONS },
        ]}
        checkboxes={[
          { name: 'regular', label: 'Show regular (weekly)' },
          { name: 'ongoing', label: 'Show ongoing (open daily, exhibitions)' },
        ]}
      />
      <ul className="divide-y divide-stone-200 rounded border border-stone-200 bg-white">
        {rows.map(({ event: e, venue }) => (
          <li key={e.id} className="flex items-start gap-4 p-3">
            {e.headerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={webImage(e.headerImage, 160, 120)} alt="" className="h-[60px] w-[80px] shrink-0 rounded object-cover" />
            ) : <div className="h-[60px] w-[80px] shrink-0 rounded bg-stone-100" />}
            <div className="min-w-0 flex-1">
              <Link href={`/admin/whats-on/${e.slug}`} className="font-medium hover:underline">{e.title}</Link>{' '}
              <OccurrenceBadge occurrence={e.occurrence} />
              {e.highlight && <span className="ml-1 text-xs font-semibold text-amber-700">★ Highlight</span>}
              <div className="text-sm text-stone-600">
                {venue ? <Link href={`/admin/venues/${venue.slug}`} className="hover:underline">{venue.name}</Link> : e.venue ?? <span className="italic">No venue given</span>}
              </div>
              <div className="text-sm text-stone-500">
                {eventDatesText(e.dates)}
                {priceRange(e.fromPricePence, e.toPricePence) && <> · {priceRange(e.fromPricePence, e.toPricePence)}</>}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <InclusionBadge inclusion={e.inclusion} />
              <InclusionControl kind="event" id={e.id} inclusion={e.inclusion} />
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="p-6 text-center text-sm text-stone-500">No events match.</li>}
      </ul>
    </>
  );
}

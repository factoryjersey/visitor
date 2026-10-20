import Link from 'next/link';
import { Filters, INCLUSION_OPTIONS } from '@/components/filters';
import { InclusionBadge, InclusionControl } from '@/components/inclusion';
import { CATEGORIES } from '@/lib/db/schema';
import { listVenues } from '@/lib/db/queries';
import { CATEGORY_LABEL, asCategory, asInclusion, one, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';

export default async function Venues({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const values = { q: one(sp.q), inclusion: one(sp.inclusion), category: one(sp.category), all: one(sp.all), tag: one(sp.tag) };
  // Venues that host events by default; every directory listing on request.
  const rows = await listVenues({
    q: values.q,
    inclusion: asInclusion(values.inclusion),
    category: asCategory(values.category),
    hostsEvents: values.all !== '1' && !values.tag,
  });
  const tagged = rows.filter(({ place: p }) => (values.tag === 'recommended' ? !!p.recommendedIn : values.tag === 'client' ? p.client : true));

  return (
    <>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="font-display text-2xl">Venues</h1>
        <p className="text-sm text-stone-500">{tagged.length} {values.all === '1' || values.tag ? 'listings' : 'venues hosting events'}</p>
      </div>
      <Filters
        action="/admin/venues"
        values={values}
        selects={[
          { name: 'category', label: 'Section', options: CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] })) },
          { name: 'inclusion', label: 'Status', options: INCLUSION_OPTIONS },
          { name: 'tag', label: 'Tag', options: [{ value: 'recommended', label: 'Visitor recommended' }, { value: 'client', label: 'Clients' }] },
        ]}
        checkboxes={[{ name: 'all', label: 'All directory listings, not only event venues' }]}
      />
      <ul className="divide-y divide-stone-200 rounded border border-stone-200 bg-white">
        {tagged.map(({ place: p, eventCount }) => (
          <li key={p.id} className="flex items-center gap-4 p-3">
            <div className="min-w-0 flex-1">
              <Link href={`/admin/venues/${p.slug}`} className="font-medium hover:underline">{p.name}</Link>
              <div className="text-sm text-stone-500">
                {CATEGORY_LABEL[p.category]}{p.parish && ` · ${p.parish}`}
                {eventCount > 0 && ` · ${eventCount} event${eventCount === 1 ? '' : 's'}`}
                {p.lat === null && <span className="text-amber-700"> · no map pin</span>}
              </div>
            </div>
            {p.recommendedIn && <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700" title={`Featured in ${p.recommendedIn}`}>Recommended</span>}
            {p.client && <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Client</span>}
            <InclusionBadge inclusion={p.inclusion} />
            <InclusionControl kind="venue" id={p.id} inclusion={p.inclusion} />
          </li>
        ))}
        {tagged.length === 0 && <li className="p-6 text-center text-sm text-stone-500">No venues match.</li>}
      </ul>
    </>
  );
}

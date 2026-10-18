import Link from 'next/link';
import { Filters, INCLUSION_OPTIONS } from '@/components/filters';
import { InclusionBadge, InclusionControl } from '@/components/inclusion';
import { OccurrenceBadge } from '@/components/occurrence';
import { listExperiences } from '@/lib/db/queries';
import { GENRES, type Genre } from '@/lib/domain/genre';
import { printTourDates } from '@/lib/domain/house-style';
import { asInclusion, occurrencesFrom, one, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';

function monthOptions() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    return { value: d.toISOString().slice(0, 7), label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) };
  });
}

/**
 * Tours and experiences. Dated ones first and by default: the ones on
 * particular days. Those bookable whenever someone asks are behind the
 * "on demand" tick, because providers list every service that way.
 */
export default async function Tours({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const values = { q: one(sp.q), inclusion: one(sp.inclusion), month: one(sp.month), genre: one(sp.genre), regular: one(sp.regular), ongoing: one(sp.ongoing) };
  const genre = values.genre === 'none' ? 'none' : (GENRES as readonly string[]).includes(values.genre ?? '') ? (values.genre as Genre) : undefined;
  const rows = await listExperiences({
    q: values.q,
    inclusion: asInclusion(values.inclusion),
    month: values.month,
    genre,
    occurrences: occurrencesFrom(values),
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="font-serif text-2xl">Tours &amp; experiences</h1>
        <p className="text-sm text-stone-500">
          {rows.length} shown · <Link href="/admin/tours/providers" className="hover:underline">Providers and codes</Link>
        </p>
      </div>
      <Filters
        action="/admin/tours"
        values={values}
        selects={[
          { name: 'month', label: 'On during', options: monthOptions() },
          { name: 'genre', label: 'Genre', options: [...GENRES.map((g) => ({ value: g, label: g })), { value: 'none', label: 'No genre yet' }] },
          { name: 'inclusion', label: 'Status', options: INCLUSION_OPTIONS },
        ]}
        checkboxes={[
          { name: 'regular', label: 'Show regular (weekly)' },
          { name: 'ongoing', label: 'Show on demand (bookable any day)' },
        ]}
      />
      <ul className="divide-y divide-stone-200 rounded border border-stone-200 bg-white">
        {rows.map(({ experience: x, provider }) => {
          const upcoming = x.dates.filter((d) => d.date >= today);
          return (
            <li key={x.id} className="flex items-start gap-4 p-3">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/tours/${x.slug}`} className="font-medium hover:underline">{x.title}</Link>{' '}
                <OccurrenceBadge occurrence={x.occurrence} onDemand />
                <div className="text-sm text-stone-600">
                  {provider ? <>{provider.code && <strong className="mr-1">{provider.code}</strong>}{provider.name}</> : <span className="italic">No provider</span>}
                  {x.genre ? ` · ${x.genre}` : <span className="text-amber-700"> · no genre</span>}
                  {x.duration && ` · ${x.duration}`}
                </div>
                <div className="text-sm text-stone-500">
                  {x.occurrence === 'ongoing' ? `${upcoming.length} bookable dates` : printTourDates(upcoming.slice(0, 12)) ?? 'No dates ahead'}
                  {x.occurrence !== 'ongoing' && upcoming.length > 12 && ' …'}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <InclusionBadge inclusion={x.inclusion} />
                <InclusionControl kind="experience" id={x.id} inclusion={x.inclusion} />
              </div>
            </li>
          );
        })}
        {rows.length === 0 && <li className="p-6 text-center text-sm text-stone-500">Nothing matches.</li>}
      </ul>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { publicOrganisers } from '@/lib/db/public';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Organisers', description: 'Charities, promoters and tour operators putting things on in Jersey.' };

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Who puts things on, the busiest first, with a letter index for the long tail. */
export default async function OrganisersPage() {
  const organisers = await publicOrganisers();
  const alphabetical = [...organisers].sort((a, b) => a.name.localeCompare(b.name));
  const busiest = organisers.slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 font-display text-3xl font-bold text-ink">Organisers</h1>
      <p className="mb-8 max-w-2xl text-harbour/70">
        Charities, promoters, clubs and tour operators: {organisers.length} with something coming up.
      </p>

      {busiest.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-coral">Busiest</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {busiest.map((o) => (
              <li key={o.slug}>
                <Link href={`/organisers/${o.slug}`} className="group block h-full rounded-lg bg-white p-4 shadow-sm ring-1 ring-harbour/5 transition hover:shadow-md">
                  <h3 className="font-display text-base font-semibold leading-snug text-ink group-hover:text-coral">{o.name}</h3>
                  <p className="mt-2 text-sm text-sea">
                    {[o.events && count(o.events, 'event', 'events'), o.tours && count(o.tours, 'tour', 'tours')].filter(Boolean).join(' · ')} coming up
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 border-b border-harbour/15 pb-2 font-display text-xl font-semibold text-ink">A to Z</h2>
        <ul className="columns-1 gap-8 sm:columns-2 lg:columns-3">
          {alphabetical.map((o) => (
            <li key={o.slug} className="break-inside-avoid py-1.5">
              <Link href={`/organisers/${o.slug}`} className="hover:text-coral">{o.name}</Link>
              <span className="ml-2 text-xs text-harbour/50">{o.events + o.tours}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

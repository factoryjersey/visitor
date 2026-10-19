import type { Metadata } from 'next';
import Link from 'next/link';
import { publicVenuesWithEvents } from '@/lib/db/public';
import { printParish } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import { CATEGORY_LABEL } from '@/lib/params';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Venues', description: 'Theatres, halls, pubs and places in Jersey with events coming up.' };

/** Every venue with something coming up, the busiest first. */
export default async function VenuesPage() {
  const venues = await publicVenuesWithEvents({ withOngoing: true });
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 font-display text-3xl font-bold text-ink">Venues</h1>
      <p className="mb-8 max-w-2xl text-harbour/70">Where things are on: {venues.length} venues with events coming up.</p>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {venues.map((v) => (
          <li key={v.id}>
            <Link href={`/venues/${v.slug}`} className="group flex h-full gap-4 rounded-lg bg-white p-3 shadow-sm ring-1 ring-harbour/5 transition hover:shadow-md">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-harbour/10">
                {v.headerImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={webImage(v.headerImage, 200, 200)} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <h2 className="font-display text-base font-semibold leading-snug text-ink group-hover:text-brand">{v.name}</h2>
                <p className="mt-0.5 text-xs text-harbour/60">{[printParish(v.parish), CATEGORY_LABEL[v.category]].filter(Boolean).join(' · ')}</p>
                <p className="mt-2 text-sm font-medium text-sea">{v.count} {v.count === 1 ? 'event' : 'events'} coming up</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

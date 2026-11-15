import type { Metadata } from 'next';
import Link from 'next/link';
import { alternates } from '@/lib/agents/data';
import { publicBeaches } from '@/lib/db/public';
import { BEACH_INTRO, BEACH_NOTES, COAST_ORDER, facingWords } from '@/lib/domain/beaches';
import { webImage } from '@/lib/domain/images';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Beaches',
  description: 'Jersey’s beaches by coast: which way each faces, the buses that stop nearby, and what to know about the tides.',
  alternates: alternates('/beaches'),
};

/** What jersey.com says a beach has, in a visitor's words: the few that help choose one. */
const AMENITY: Record<string, string> = { Catering: 'Café or kiosk', Parking: 'Parking', 'Pet friendly': 'Dog friendly', 'Wheelchair access': 'Wheelchair access' };

/**
 * The beaches, as the printed guide's Beach Guide has them: by coast,
 * each with which way it faces (the sun it gets), its buses and what is
 * there; then the tides, safe swimming and the beach wheelchairs.
 */
export default async function Beaches() {
  const beaches = await publicBeaches();
  const coasts = [...COAST_ORDER, ...new Set(beaches.map((b) => b.area ?? '').filter((a) => a && !(COAST_ORDER as readonly string[]).includes(a)))];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="max-w-3xl">
        <h1 className="font-display text-4xl font-semibold text-ink">Beaches</h1>
        <p className="mt-4 text-lg leading-relaxed text-harbour/80">{BEACH_INTRO}</p>
      </header>

      {coasts.map((coast) => {
        const here = beaches.filter((b) => (b.area ?? '') === coast);
        if (!here.length) return null;
        return (
          <section key={coast} className="mt-12">
            <h2 className="mb-4 border-b border-harbour/15 pb-2 font-display text-xl font-semibold text-ink">{coast} coast</h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {here.map((b) => {
                const amenities = b.facilities.map((f) => AMENITY[f]).filter(Boolean);
                return (
                  <li key={b.id} className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-harbour/5">
                    <Link href={`/venues/${b.slug}`} className="group block h-full">
                      <div className="aspect-[3/2] bg-harbour/10">
                        {b.headerImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={webImage(b.headerImage, 600, 400)} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-display text-lg font-semibold text-ink group-hover:text-brand">{b.name}</h3>
                        {b.facing && <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-sea">{facingWords(b.facing)}</p>}
                        <p className="mt-2 text-sm leading-relaxed text-harbour/80">{b.guideCopy ?? b.summary}</p>
                        {b.sourceNotes.map((n) => (
                          <p key={n.source} className="mt-2 text-sm leading-relaxed text-harbour/70">
                            <span className="font-semibold text-ink">{n.short}:</span> {n.text}
                          </p>
                        ))}
                        <p className="mt-3 text-xs text-harbour/60">
                          {[b.busRoutes.length ? `Bus ${b.busRoutes.join(', ')}` : null, ...amenities].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className="mt-10 text-sm text-harbour/60">
        Notes on the rocks and history from the{' '}
        <a href="https://www.jerseyislandgeopark.org.je/explore/" target="_blank" rel="noopener" className="text-sea hover:text-brand">aspiring Jersey Island Geopark ↗</a>, and on wildlife and walks from{' '}
        <a href="https://jerseynationalpark.com/" target="_blank" rel="noopener" className="text-sea hover:text-brand">Jersey National Park ↗</a>.
      </p>

      <section className="mt-14 grid gap-6 md:grid-cols-3">
        {BEACH_NOTES.map((n) => (
          <div key={n.title} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-harbour/5">
            <h2 className="font-display text-lg font-semibold text-ink">{n.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-harbour/80">{n.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

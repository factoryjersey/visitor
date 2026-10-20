import type { Metadata } from 'next';
import { alternates } from '@/lib/agents/data';
import Link from 'next/link';
import { publicAllVenues, publicVenuesWithSomethingOn } from '@/lib/db/public';
import { CATEGORIES, type Category, type Image } from '@/lib/db/schema';
import { printParish } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import { CATEGORY_LABEL } from '@/lib/params';
import { Recommended } from '@/components/site/recommended';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Venues', description: 'Places to stay, eat and drink, see, do and shop in Jersey, and where events are on.', alternates: alternates('/venues') };

type Props = { searchParams: Promise<{ show?: string; category?: string }> };

type Card = { id: string; slug: string; name: string; parish: string | null; category: Category; headerImage: Image | null; summary: string | null; recommendedIn: string | null };

function VenueCard({ v, line }: { v: Card; line: string | null }) {
  return (
    <li>
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
          {v.recommendedIn && <Recommended className="mt-1.5" />}
          {line && <p className="mt-2 text-sm font-medium text-sea">{line}</p>}
        </div>
      </Link>
    </li>
  );
}

const tab = (active: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${active ? 'bg-harbour text-white' : 'bg-white text-ink ring-1 ring-harbour/15 hover:ring-brand'}`;

const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/**
 * Where things are on, the busiest first; or, under "See all", every
 * venue and business we list, by the guide's sections, the visitor
 * recommended first.
 */
export default async function VenuesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const all = sp.show === 'all';
  const category = CATEGORIES.find((c) => c === sp.category);

  if (!all) {
    const venues = await publicVenuesWithSomethingOn();
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-2 font-display text-3xl font-bold text-ink">Venues</h1>
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
          <p className="max-w-2xl text-harbour/70">Where things are on: {venues.length} venues with events or tours coming up.</p>
          <Link href="/venues?show=all" className="text-sm font-semibold text-sea hover:text-brand">See all venues and businesses →</Link>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((v) => (
            <VenueCard key={v.id} v={v} line={[v.events && `${count(v.events, 'event')}`, v.tours && `${count(v.tours, 'tour')}`].filter(Boolean).join(' · ') + ' coming up'} />
          ))}
        </ul>
      </div>
    );
  }

  const venues = await publicAllVenues(category);
  const sections = category ? [category] : CATEGORIES.filter((c) => venues.some((v) => v.category === c));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 font-display text-3xl font-bold text-ink">All venues and businesses</h1>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <p className="max-w-2xl text-harbour/70">
          {venues.length} places{category ? ` to ${CATEGORY_LABEL[category].toLowerCase()}` : ''}. <Recommended className="align-middle" /> marks those in our printed guide.
        </p>
        <Link href="/venues" className="text-sm font-semibold text-sea hover:text-brand">← Only those with something on</Link>
      </div>
      <nav aria-label="Sections" className="mb-8 flex flex-wrap gap-2">
        <Link href="/venues?show=all" className={tab(!category)}>All</Link>
        {CATEGORIES.map((c) => (
          <Link key={c} href={`/venues?show=all&category=${c}`} className={tab(category === c)}>{CATEGORY_LABEL[c]}</Link>
        ))}
      </nav>
      {sections.map((c) => (
        <section key={c} className="mb-12">
          <h2 className="mb-4 border-b border-harbour/15 pb-2 font-display text-xl font-semibold text-ink">{CATEGORY_LABEL[c]}</h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {venues.filter((v) => v.category === c).map((v) => <VenueCard key={v.id} v={v} line={null} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}

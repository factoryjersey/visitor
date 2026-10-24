import type { Metadata } from 'next';
import { alternates } from '@/lib/agents/data';
import Link from 'next/link';
import { publicAllVenues, publicVenuesWithSomethingOn } from '@/lib/db/public';
import { CATEGORIES, type Category, type Image } from '@/lib/db/schema';
import { printParish } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import { CATEGORY_LABEL, STAY_TYPES } from '@/lib/params';
import { Recommended } from '@/components/site/recommended';
import { Directory, VenueSpread } from '@/components/site/venue-spread';
import { spread } from '@/lib/domain/editorial';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Venues', description: 'Places to stay, eat and drink, see, do and shop in Jersey, and where events are on.', alternates: alternates('/venues') };

type Props = { searchParams: Promise<{ show?: string; category?: string; stay?: string }> };

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
 * venue and business we list, each of the guide's sections laid out as a
 * magazine spread led by those the printed guide gives most space.
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
  const stayKind = category === 'stay' ? STAY_TYPES.find((k) => k.slug === sp.stay) : undefined;
  const sections = category ? [category] : CATEGORIES.filter((c) => venues.some((v) => v.category === c));
  const heading = stayKind ? stayKind.plural : category ? CATEGORY_LABEL[category] : 'Where to stay, eat, see, do and shop';
  const shown = stayKind ? venues.filter((v) => v.stayType === stayKind.type) : venues;

  // One part of the page: a spread, and on a section's own page the rest A to Z below it.
  const part = (key: string, title: string, items: typeof venues, o: { full: boolean; banner: boolean; more?: string }) => {
    const s = spread(items, o.full ? { stories: 4, sidebar: 10 } : { stories: 2, sidebar: 6 });
    return (
      <div key={key}>
        <VenueSpread title={title} spread={s} total={items.length} more={o.more} banner={o.banner} />
        {o.full && <Directory items={s.rest} title={`${title} A to Z`} />}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{heading}</h1>
          <p className="mt-2 max-w-2xl text-harbour/70">
            {shown.length} {stayKind ? stayKind.plural.toLowerCase() : `places${category ? ` to ${CATEGORY_LABEL[category].toLowerCase()}` : ' across the island'}`}, led by those in our printed guide.
          </p>
        </div>
        <Link href="/venues" className="text-sm font-semibold text-sea hover:text-brand">← Only those with something on</Link>
      </div>
      <nav aria-label="Sections" className="mb-10 flex flex-wrap gap-2">
        <Link href="/venues?show=all" className={tab(!category)}>All</Link>
        <Link href="/venues?show=all&category=stay&stay=hotels" className={tab(stayKind?.slug === 'hotels')}>Hotels</Link>
        {CATEGORIES.map((c) => (
          <Link key={c} href={`/venues?show=all&category=${c}`} className={tab(category === c && !stayKind)}>{CATEGORY_LABEL[c]}</Link>
        ))}
      </nav>
      {stayKind
        ? part(stayKind.slug, stayKind.plural, shown, { full: true, banner: false })
        : category === 'stay'
          ? // Places to stay by kind, each its own spread; anything Visit Jersey does not type comes last.
            [
              ...STAY_TYPES.map((k) => ({ key: k.slug, title: k.plural, items: venues.filter((v) => v.stayType === k.type), more: `/venues?show=all&category=stay&stay=${k.slug}` })),
              { key: 'other', title: 'Other places to stay', items: venues.filter((v) => !STAY_TYPES.some((k) => k.type === v.stayType)), more: undefined },
            ]
              .filter((x) => x.items.length)
              .map((x) => part(x.key, x.title, x.items, { full: !x.more, banner: true, more: x.more }))
          : sections.map((c) =>
              part(c, CATEGORY_LABEL[c], venues.filter((v) => v.category === c), {
                full: !!category,
                banner: !category,
                more: category ? undefined : `/venues?show=all&category=${c}`,
              }),
            )}
    </div>
  );
}

import type { Metadata } from 'next';
import { alternates } from '@/lib/agents/data';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { publicAllVenues, publicVenuesWithSomethingOn } from '@/lib/db/public';
import { CATEGORIES, type Category, type Image } from '@/lib/db/schema';
import { printParish } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import { CATEGORY_LABEL, STAY_TYPES } from '@/lib/params';
import { Recommended } from '@/components/site/recommended';
import { Directory, VenueSpread } from '@/components/site/venue-spread';
import { spread } from '@/lib/domain/editorial';
import { NEW_MONTHS, addedLine, isNewVenue } from '@/lib/domain/new-venue';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Venues', description: 'Places to stay, eat and drink, see, do and shop in Jersey, and where events are on.', alternates: alternates('/venues') };

type Props = { searchParams: Promise<{ show?: string; on?: string; new?: string; category?: string; stay?: string }> };

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

/** A page of this listing: `on` keeps to venues with something coming up, `fresh` to those new in the last six months. */
const href = (o: { category?: Category; stay?: string; on?: boolean; fresh?: boolean }) => {
  const q = new URLSearchParams();
  if (o.on) q.set('on', 'events');
  if (o.fresh) q.set('new', '1');
  if (o.category) q.set('category', o.category);
  if (o.stay) q.set('stay', o.stay);
  const s = q.toString();
  return s ? `/venues?${s}` : '/venues';
};

function Sections({ category, stay, on, fresh }: { category?: Category; stay?: string; on: boolean; fresh: boolean }) {
  return (
    <nav aria-label="Sections" className="mb-10 flex flex-wrap items-center gap-2">
      <Link href={href({ on, fresh })} className={tab(!category)}>All</Link>
      <Link href={href({ category: 'stay', stay: 'hotels', on, fresh })} className={tab(stay === 'hotels')}>Hotels</Link>
      {CATEGORIES.map((c) => (
        <Link key={c} href={href({ category: c, on, fresh })} className={tab(category === c && !stay)}>{CATEGORY_LABEL[c]}</Link>
      ))}
      <span aria-hidden className="mx-1 h-6 w-px bg-harbour/15" />
      {/* One filter at a time: choosing one drops the other. */}
      <Link href={href({ category, stay, on: !on })} aria-pressed={on} className={tab(on)}>
        With events on
      </Link>
      <Link href={href({ category, stay, fresh: !fresh })} aria-pressed={fresh} className={tab(fresh)}>
        New
      </Link>
    </nav>
  );
}

/**
 * Every venue and business we list, each of the guide's sections laid out
 * as a magazine spread led by those the printed guide gives most space;
 * or, filtered to those with events, where things are on, busiest first;
 * or to those new in the last six months, newest first.
 */
export default async function VenuesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const category = CATEGORIES.find((c) => c === sp.category);
  // The spread was once under ?show=all; it is the page itself now.
  if (sp.show === 'all') redirect(href({ category, stay: sp.stay }));
  const fresh = sp.new === '1';
  const on = !fresh && sp.on === 'events';

  if (on) {
    const venues = (await publicVenuesWithSomethingOn()).filter((v) => !category || v.category === category);
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-2 font-display text-3xl font-bold text-ink sm:text-4xl">{category ? CATEGORY_LABEL[category] : 'Venues'} with events on</h1>
        <p className="mb-6 max-w-2xl text-harbour/70">{venues.length} venues with events or tours coming up, the busiest first.</p>
        <Sections category={category} on fresh={false} />
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

  if (fresh) {
    const added = venues
      .filter((v) => isNewVenue(v.firstListedAt) && (!stayKind || v.stayType === stayKind.type))
      .sort((a, b) => +new Date(b.firstListedAt!) - +new Date(a.firstListedAt!));
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-2 font-display text-3xl font-bold text-ink sm:text-4xl">New {stayKind ? stayKind.plural.toLowerCase() : category ? `in ${CATEGORY_LABEL[category]}` : 'places'}</h1>
        <p className="mb-6 max-w-2xl text-harbour/70">{count(added.length, 'place')} new to the island&rsquo;s listings in the last {NEW_MONTHS} months, the newest first.</p>
        <Sections category={category} stay={stayKind?.slug} on={false} fresh />
        {added.length ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {added.map((v) => <VenueCard key={v.id} v={v} line={addedLine(v.firstListedAt!)} />)}
          </ul>
        ) : (
          <p className="text-harbour/70">Nothing new here in the last {NEW_MONTHS} months.</p>
        )}
      </div>
    );
  }

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
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{heading}</h1>
        <p className="mt-2 max-w-2xl text-harbour/70">
          {shown.length} {stayKind ? stayKind.plural.toLowerCase() : `places${category ? ` to ${CATEGORY_LABEL[category].toLowerCase()}` : ' across the island'}`}, led by those in our printed guide.
        </p>
      </div>
      <Sections category={category} stay={stayKind?.slug} on={false} fresh={false} />
      {stayKind
        ? part(stayKind.slug, stayKind.plural, shown, { full: true, banner: false })
        : category === 'stay'
          ? // Places to stay by kind, each its own spread; anything Visit Jersey does not type comes last.
            [
              ...STAY_TYPES.map((k) => ({ key: k.slug, title: k.plural, items: venues.filter((v) => v.stayType === k.type), more: href({ category: 'stay', stay: k.slug }) })),
              { key: 'other', title: 'Other places to stay', items: venues.filter((v) => !STAY_TYPES.some((k) => k.type === v.stayType)), more: undefined },
            ]
              .filter((x) => x.items.length)
              .map((x) => part(x.key, x.title, x.items, { full: !x.more, banner: true, more: x.more }))
          : sections.map((c) =>
              part(c, CATEGORY_LABEL[c], venues.filter((v) => v.category === c), {
                full: !!category,
                banner: !category,
                more: category ? undefined : href({ category: c }),
              }),
            )}
    </div>
  );
}

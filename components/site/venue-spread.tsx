import Link from 'next/link';
import type { Category, Image, ListingSize } from '@/lib/db/schema';
import type { Spread } from '@/lib/domain/editorial';
import { printParish } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import { CATEGORY_LABEL } from '@/lib/params';
import { Recommended } from './recommended';

export type SpreadVenue = {
  id: string;
  slug: string;
  name: string;
  parish: string | null;
  category: Category;
  headerImage: Image | null;
  summary: string | null;
  recommendedIn: string | null;
  listingSize: ListingSize;
  guideCopy: string | null;
  guideLabel: string | null;
  aaRating?: string | null;
};

/** The small line over a headline, as the printed guide labels its listings: its label (SPANISH, SPA), else where it is. */
const label = (v: SpreadVenue) => (v.guideLabel ?? '').trim().toUpperCase();
const kicker = (v: SpreadVenue) => label(v) || (v.aaRating ?? '').toUpperCase() || printParish(v.parish) || CATEGORY_LABEL[v.category];
const copy = (v: SpreadVenue) => v.guideCopy ?? v.summary;

function Lead({ v }: { v: SpreadVenue }) {
  return (
    <article>
      <Link href={`/venues/${v.slug}`} className="group block">
        <div className="aspect-[16/9] overflow-hidden rounded-lg bg-harbour/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={webImage(v.headerImage!, 1200, 675)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
        </div>
        <p className="mt-4 font-display text-xs font-bold uppercase tracking-[0.2em] text-brand">{kicker(v)}</p>
        <h3 className="mt-1 font-display text-3xl font-bold leading-tight text-ink group-hover:text-brand sm:text-4xl">{v.name}</h3>
        {copy(v) && <p className="mt-3 line-clamp-4 text-lg leading-relaxed text-harbour/80">{copy(v)}</p>}
        {v.recommendedIn && <Recommended className="mt-3" />}
      </Link>
    </article>
  );
}

function Story({ v }: { v: SpreadVenue }) {
  return (
    <article>
      <Link href={`/venues/${v.slug}`} className="group block">
        <div className="aspect-[3/2] overflow-hidden rounded-md bg-harbour/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={webImage(v.headerImage!, 600, 400)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        </div>
        <p className="mt-3 font-display text-[0.7rem] font-bold uppercase tracking-[0.18em] text-brand">{kicker(v)}</p>
        <h3 className="mt-0.5 font-display text-xl font-bold leading-snug text-ink group-hover:text-brand">{v.name}</h3>
        {copy(v) && <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-harbour/75">{copy(v)}</p>}
        {v.recommendedIn && <Recommended className="mt-2" />}
      </Link>
    </article>
  );
}

/** The ruled column beside the stories: names first, as the printed guide's smaller listings. */
function Sidebar({ items, title }: { items: SpreadVenue[]; title: string }) {
  if (!items.length) return null;
  return (
    <aside>
      <h3 className="border-b-2 border-harbour pb-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-harbour">{title}</h3>
      <ul>
        {items.map((v) => (
          <li key={v.id} className="border-b border-harbour/15">
            <Link href={`/venues/${v.slug}`} className="group flex gap-3 py-3">
              {v.headerImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={webImage(v.headerImage, 120, 120)} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded object-cover" />
              )}
              <span className="min-w-0">
                <span className="block font-display font-semibold leading-snug text-ink group-hover:text-brand">{v.name}</span>
                <span className="block text-xs text-harbour/60">{[label(v), printParish(v.parish)].filter(Boolean).join(' · ')}</span>
                {v.recommendedIn && <span className="mt-0.5 block text-[0.65rem] font-semibold uppercase tracking-wide text-brand">Visitor recommended</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** Everything else, A to Z in columns, as the printed guide's directory. */
export function Directory({ items, title }: { items: SpreadVenue[]; title: string }) {
  if (!items.length) return null;
  return (
    <div className="mt-12">
      <h3 className="mb-4 border-b-2 border-harbour pb-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-harbour">{title}</h3>
      <ul className="gap-8 sm:columns-2 lg:columns-3">
        {items.map((v) => (
          <li key={v.id} className="break-inside-avoid border-b border-harbour/10">
            <Link href={`/venues/${v.slug}`} className="group flex items-baseline justify-between gap-3 py-2 text-sm">
              <span className="font-semibold text-ink group-hover:text-brand">{v.name}</span>
              <span className="shrink-0 text-xs text-harbour/55">{printParish(v.parish)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A guide section as a magazine spread: the lead story across two thirds,
 * the next stories under it two by two, and the ruled sidebar beside them.
 */
export function VenueSpread({ title, spread, total, more, banner = true }: { title: string; spread: Spread<SpreadVenue>; total: number; more?: string; banner?: boolean }) {
  const label = title;
  return (
    <section className="mb-16">
      <header className={`mb-6 flex items-end justify-between gap-4 border-b-4 border-brand ${banner ? 'pb-3' : ''}`}>
        {/* On a section's own page its name is the page heading already: the rule alone opens the spread. */}
        {banner && (
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-harbour/60">{total} places</p>
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-harbour sm:text-4xl">{label}</h2>
          </div>
        )}
        {more && (
          <Link href={more} className="shrink-0 pb-1 text-sm font-semibold text-sea hover:text-brand">
            See all {total} →
          </Link>
        )}
      </header>
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {spread.lead && <Lead v={spread.lead} />}
          {spread.stories.length > 0 && (
            <div className={`grid gap-8 sm:grid-cols-2 ${spread.lead ? 'mt-10 border-t border-harbour/15 pt-8' : ''}`}>
              {spread.stories.map((v) => <Story key={v.id} v={v} />)}
            </div>
          )}
        </div>
        <Sidebar items={spread.sidebar} title={spread.lead ? `Also in ${label.toLowerCase()}` : label} />
      </div>
    </section>
  );
}

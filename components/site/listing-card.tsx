import Link from 'next/link';
import { printTitle } from '@/lib/domain/house-style';
import type { Image } from '@/lib/db/schema';
import type { Genre } from '@/lib/domain/genre';
import { CardMore } from './card-more';
import { CategoryMarkers } from './category-markers';
import { webImage } from '@/lib/domain/images';

export { cardLocation } from '@/lib/domain/house-style';

/** One event or tour in a list: picture, when, what, where. */
export function ListingCard(props: {
  href: string;
  title: string;
  when: string | null;
  /** Venue or meeting point, small under the title with a pin. */
  location?: string | null;
  /** A second line under that: for tours, who runs it and how long. */
  where?: string | null;
  price?: string | null;
  image: Image | null;
  tag?: string | null;
  /** Its kinds, shown as small icons in the picture's corner. */
  types?: readonly string[] | null;
  /** A tour's genre: one tile in the corner instead. */
  genre?: Genre | null;
  highlight?: boolean;
  /** A feature: full width, image beside the text. For a highlight on its own. */
  wide?: boolean;
  /** Always the full card, whatever the listing's view: the highlights at the top. */
  featured?: boolean;
  /** Its one sentence: shown on a wide card, folded behind an arrow on the others. */
  summary?: string | null;
}) {
  // Not a wide card: it follows the listing's view (lib/view.ts), set on a ViewFrame above it.
  const v = !props.wide && !props.featured;
  return (
    <div className={`group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-harbour/5 transition hover:shadow-md ${v ? 'group-data-[view=list]/view:rounded-md' : ''}`}>
      <Link href={props.href} className={`flex flex-1 flex-col ${props.wide ? 'md:flex-row' : v ? 'group-data-[view=list]/view:flex-row' : ''}`}>
        {/* Every picture cropped to the same 3:2 landscape, at every width: the image fills its frame, never sets it. */}
        <div
          className={`relative aspect-[3/2] shrink-0 overflow-hidden bg-harbour/10 ${props.wide ? 'md:aspect-auto md:min-h-[320px] md:w-3/5' : !v ? '' : 'group-data-[view=list]/view:m-2.5 group-data-[view=list]/view:mr-0 group-data-[view=list]/view:w-28 group-data-[view=list]/view:self-start group-data-[view=list]/view:rounded sm:group-data-[view=list]/view:w-36'}`}
        >
          {props.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.wide ? webImage(props.image, 1200, 800) : webImage(props.image, 640, 427)} alt={props.image.alt ?? ''} loading={props.wide ? 'eager' : 'lazy'} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
          )}
          {props.highlight && <span className={`absolute left-3 top-3 rounded bg-brand px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white ${v ? 'group-data-[view=list]/view:hidden group-data-[view=two]/view:left-2 group-data-[view=two]/view:top-2 group-data-[view=two]/view:text-[0.6rem]' : ''}`}>Highlight</span>}
          {!props.highlight && props.tag && <span className={`absolute left-3 top-3 rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-harbour ${v ? 'group-data-[view=list]/view:hidden group-data-[view=two]/view:left-2 group-data-[view=two]/view:top-2 group-data-[view=two]/view:text-[0.6rem]' : ''}`}>{props.tag}</span>}
          <span className={v ? 'group-data-[view=list]/view:hidden group-data-[view=two]/view:hidden' : ''}>
            <CategoryMarkers types={props.types} genre={props.genre} />
          </span>
        </div>
        <div className={`flex min-w-0 flex-1 flex-col gap-1 p-4 ${props.wide ? 'md:justify-center md:p-8' : !v ? '' : 'group-data-[view=list]/view:py-2.5 group-data-[view=list]/view:pl-3 group-data-[view=list]/view:pr-3 group-data-[view=two]/view:gap-0.5 group-data-[view=two]/view:p-2.5'}`}>
          {props.when && <p className={`text-xs font-semibold uppercase tracking-wide text-sea ${v ? 'group-data-[view=two]/view:text-[0.65rem]' : ''}`}>{props.when}</p>}
          <h3 className={`font-display font-semibold leading-snug text-ink group-hover:text-brand ${props.wide ? 'text-xl md:text-2xl' : !v ? 'text-base' : 'text-base group-data-[view=list]/view:line-clamp-2 group-data-[view=list]/view:text-[0.95rem] group-data-[view=two]/view:line-clamp-3 group-data-[view=two]/view:text-sm'}`}>{printTitle(props.title)}</h3>
          {props.location && (
            <p className={`flex items-start gap-1 text-xs text-harbour/60 ${v ? 'group-data-[view=list]/view:truncate group-data-[view=two]/view:text-[0.7rem]' : ''}`}>
              <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0 fill-current"><path d="M8 1.5a4.75 4.75 0 0 0-4.75 4.75c0 3.4 4.06 7.6 4.23 7.78a.72.72 0 0 0 1.04 0c.17-.18 4.23-4.38 4.23-7.78A4.75 4.75 0 0 0 8 1.5Zm0 6.6a1.85 1.85 0 1 1 0-3.7 1.85 1.85 0 0 1 0 3.7Z" /></svg>
              <span className={v ? 'group-data-[view=list]/view:truncate' : ''}>{props.location}</span>
            </p>
          )}
          {props.where && <p className={`text-sm text-harbour/70 ${v ? 'group-data-[view=list]/view:truncate group-data-[view=list]/view:text-xs group-data-[view=two]/view:hidden' : ''}`}>{props.where}</p>}
          {props.wide && props.summary && <p className="mt-2 leading-relaxed text-harbour/80">{props.summary}</p>}
          {props.wide && props.price && <p className="mt-auto pt-2 text-sm font-medium">{props.price}</p>}
          {/* The small views have no foot: the price comes up here, and the description is on the page. */}
          {v && props.price && <p className="hidden pt-0.5 text-xs font-medium text-ink group-data-[view=list]/view:block group-data-[view=two]/view:block">{props.price}</p>}
        </div>
      </Link>
      {!props.wide && (
        <div className={v ? 'group-data-[view=list]/view:hidden group-data-[view=two]/view:hidden' : ''}>
          <CardMore price={props.price} summary={props.summary} />
        </div>
      )}
    </div>
  );
}

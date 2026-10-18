import Link from 'next/link';
import type { Image } from '@/lib/db/schema';
import { printParish } from '@/lib/domain/house-style';
import { CardMore } from './card-more';
import { webImage } from '@/lib/domain/images';

/** Where, for a card: the venue or meeting point, and the parish unless the name already says it. "Jersey Arts Centre, St. Helier". */
export function cardLocation(place: string | null | undefined, parish: string | null | undefined): string | null {
  const name = place?.trim() || null;
  const p = printParish(parish ?? null);
  const letters = (s: string) => s.toLowerCase().replace(/^(st\.?|saint)\s+/, '').replace(/[^a-z]/g, '');
  if (!name || !p) return name ?? p;
  return letters(name).includes(letters(p)) ? name : `${name}, ${p}`;
}

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
  highlight?: boolean;
  /** A feature: full width, image beside the text. For a highlight on its own. */
  wide?: boolean;
  /** Its one sentence: shown on a wide card, folded behind an arrow on the others. */
  summary?: string | null;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-harbour/5 transition hover:shadow-md">
      <Link href={props.href} className={`flex flex-1 flex-col ${props.wide ? 'md:flex-row' : ''}`}>
        <div className={`relative aspect-[3/2] bg-harbour/10 ${props.wide ? 'md:aspect-auto md:min-h-[320px] md:w-3/5' : ''}`}>
          {props.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.wide ? webImage(props.image, 1200, 800) : webImage(props.image, 640, 427)} alt={props.image.alt ?? ''} loading={props.wide ? 'eager' : 'lazy'} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] md:absolute md:inset-0" />
          )}
          {props.highlight && <span className="absolute left-3 top-3 rounded bg-coral px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">Highlight</span>}
          {!props.highlight && props.tag && <span className="absolute left-3 top-3 rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-harbour">{props.tag}</span>}
        </div>
        <div className={`flex flex-1 flex-col gap-1 p-4 ${props.wide ? 'md:justify-center md:p-8' : ''}`}>
          {props.when && <p className="text-xs font-semibold uppercase tracking-wide text-sea">{props.when}</p>}
          <h3 className={`font-display font-semibold leading-snug text-ink group-hover:text-coral ${props.wide ? 'text-xl md:text-2xl' : 'text-base'}`}>{props.title}</h3>
          {props.location && (
            <p className="flex items-start gap-1 text-xs text-harbour/60">
              <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0 fill-current"><path d="M8 1.5a4.75 4.75 0 0 0-4.75 4.75c0 3.4 4.06 7.6 4.23 7.78a.72.72 0 0 0 1.04 0c.17-.18 4.23-4.38 4.23-7.78A4.75 4.75 0 0 0 8 1.5Zm0 6.6a1.85 1.85 0 1 1 0-3.7 1.85 1.85 0 0 1 0 3.7Z" /></svg>
              <span>{props.location}</span>
            </p>
          )}
          {props.where && <p className="text-sm text-harbour/70">{props.where}</p>}
          {props.wide && props.summary && <p className="mt-2 leading-relaxed text-harbour/80">{props.summary}</p>}
          {props.wide && props.price && <p className="mt-auto pt-2 text-sm font-medium">{props.price}</p>}
        </div>
      </Link>
      {!props.wide && <CardMore price={props.price} summary={props.summary} />}
    </div>
  );
}

import Link from 'next/link';
import type { Image } from '@/lib/db/schema';
import { webImage } from '@/lib/domain/images';

/** One event or tour in a list: picture, when, what, where. */
export function ListingCard(props: {
  href: string;
  title: string;
  when: string | null;
  where: string | null;
  price?: string | null;
  image: Image | null;
  tag?: string | null;
  highlight?: boolean;
  /** A feature: full width, image beside the text. For a highlight on its own. */
  wide?: boolean;
  summary?: string | null;
}) {
  return (
    <Link href={props.href} className={`group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-harbour/5 transition hover:shadow-md ${props.wide ? 'md:flex-row' : ''}`}>
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
        <h3 className={`font-serif font-semibold leading-snug group-hover:text-coral ${props.wide ? 'text-2xl md:text-3xl' : 'text-lg'}`}>{props.title}</h3>
        {props.where && <p className="text-sm text-harbour/70">{props.where}</p>}
        {props.wide && props.summary && <p className="mt-2 leading-relaxed text-harbour/80">{props.summary}</p>}
        {props.price && <p className="mt-auto pt-2 text-sm font-medium">{props.price}</p>}
      </div>
    </Link>
  );
}

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { printParish, printTitle } from '@/lib/domain/house-style';
import { webImage } from '@/lib/domain/images';
import type { Hit } from '@/lib/domain/search';

/** One result: a small picture, when, what, and where, in a row a thumb can hit. */
export function SearchHit({ hit }: { hit: Hit }) {
  const parish = printParish(hit.area);
  return (
    <li>
      <Link href={hit.href} className="group flex gap-3 rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-harbour/5 transition hover:shadow-md">
        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-md bg-harbour/10">
          {hit.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={webImage(hit.image, 200, 200)} alt="" loading="lazy" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          {hit.when && <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-sea">{hit.when}</p>}
          <h3 className="line-clamp-2 font-display text-[0.95rem] font-semibold leading-snug text-ink group-hover:text-brand">
            {hit.kind === 'venues' ? hit.title : printTitle(hit.title)}
            {hit.highlight && <span className="ml-1.5 align-middle text-[0.65rem] font-semibold uppercase tracking-wide text-brand">Highlight</span>}
          </h3>
          {(hit.line || parish) && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-harbour/65">
              <MapPin aria-hidden="true" className="h-3 w-3 shrink-0" />
              <span className="truncate">{[hit.line, parish && !hit.line?.includes(parish.replace('St. ', '')) ? parish : null].filter(Boolean).join(' · ')}</span>
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

import { LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { GENRE_MARKERS, MARKERS } from './category-markers';
import { Slider } from './slider';

/**
 * The kinds of event (or of tour) as a row of icon tiles, each with how
 * many it would show given the rest of the search. One tap filters;
 * tapping the chosen one again lets it go. Links, so every choice has an
 * address.
 */
export function CategoryMenu(props: {
  action: string;
  values: Record<string, string | undefined>;
  counts: Map<string, number>;
  total: number;
  /** Events' kinds by `type`, or tours' genres by `genre`. */
  of?: 'events' | 'tours';
  /** Ways in from elsewhere, the front page: nothing is chosen yet, so no tile shows as chosen. */
  entry?: boolean;
}) {
  const tours = props.of === 'tours';
  const param = tours ? 'genre' : 'type';
  const href = (type: string | null) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(props.values)) if (v && k !== param) params.set(k, v);
    if (type) params.set(param, type);
    const qs = params.toString();
    return qs ? `${props.action}?${qs}` : props.action;
  };
  const chosen = props.values[param] ?? null;
  const all: [string, typeof LayoutGrid][] = tours ? (Object.entries(GENRE_MARKERS) as [string, typeof LayoutGrid][]) : MARKERS;
  const tiles = all.filter(([t]) => (props.counts.get(t) ?? 0) > 0 || t === chosen);

  const tile = (key: string, label: string, Icon: typeof LayoutGrid, count: number, active: boolean, to: string) => (
    <li key={key} className="shrink-0 snap-start">
      <Link
        href={to}
        scroll={false}
        aria-current={active ? 'true' : undefined}
        className={`group/tile flex w-[5.75rem] flex-col items-center gap-1.5 rounded-lg px-1 py-2.5 text-center transition-colors ${active ? 'bg-brand/10' : 'hover:bg-harbour/5'}`}
      >
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 transition-colors ${
            active ? 'bg-brand text-white ring-brand' : 'bg-white text-harbour ring-harbour/10 group-hover/tile:text-brand group-hover/tile:ring-brand/40'
          }`}
        >
          <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className={`text-[0.7rem] font-semibold leading-tight ${active ? 'text-brand' : 'text-ink'}`}>{label}</span>
        <span className="text-[0.7rem] leading-none text-harbour/50">{count}</span>
      </Link>
    </li>
  );

  return (
    <nav aria-label={tours ? 'Kinds of tour' : 'Kinds of event'} className="mb-8">
      <Slider label={tours ? 'kinds of tour' : 'kinds of event'}>
        {tile('all', 'Everything', LayoutGrid, props.total, !chosen && !props.entry, href(null))}
        {tiles.map(([type, Icon]) => tile(type, type, Icon, props.counts.get(type) ?? 0, chosen === type, href(chosen === type ? null : type)))}
      </Slider>
    </nav>
  );
}

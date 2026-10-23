import { Check } from 'lucide-react';
import Link from 'next/link';
import { GENRE_MARKERS, MARKERS } from './category-markers';
import { kindsHref } from './category-menu';

/**
 * The kinds as a list, for the phone's filter panel: bigger words than the
 * tiles and a tick each, so several can be chosen together (any of them
 * shows). Each row is a link that adds or takes away its kind, so the page
 * behind updates without closing the panel.
 */
export function CategoryList(props: {
  action: string;
  values: Record<string, string | undefined>;
  counts: Map<string, number>;
  of?: 'events' | 'tours';
}) {
  const tours = props.of === 'tours';
  const param = tours ? 'genre' : 'type';
  const chosen = (props.values[param] ?? '').split(',').filter(Boolean);
  const all = tours ? Object.entries(GENRE_MARKERS) : MARKERS;
  const rows = all.filter(([t]) => (props.counts.get(t) ?? 0) > 0 || chosen.includes(t));
  const toggle = (t: string) => kindsHref(props.action, props.values, param, chosen.includes(t) ? chosen.filter((c) => c !== t) : [...chosen, t]);

  return (
    <div className="md:hidden">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-harbour/60">{tours ? 'Kinds of tour' : 'Kinds of event'}</h3>
        {chosen.length > 0 && (
          <Link href={kindsHref(props.action, props.values, param, [])} scroll={false} className="text-sm text-harbour/60 underline">
            Clear {chosen.length}
          </Link>
        )}
      </div>
      <ul className="divide-y divide-harbour/10 border-y border-harbour/10">
        {rows.map(([type, Icon]) => {
          const on = chosen.includes(type);
          return (
            <li key={type}>
              <Link
                href={toggle(type)}
                scroll={false}
                replace
                role="checkbox"
                aria-checked={on}
                className="flex min-h-[3.25rem] items-center gap-3 py-2 text-base text-ink"
              >
                <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${on ? 'text-brand' : 'text-harbour/70'}`} strokeWidth={1.75} />
                <span className={`flex-1 ${on ? 'font-semibold' : ''}`}>{type}</span>
                <span className="text-sm tabular-nums text-harbour/50">{props.counts.get(type) ?? 0}</span>
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 transition-colors ${on ? 'bg-brand text-white ring-brand' : 'bg-white ring-harbour/25'}`}
                >
                  {on && <Check className="h-4 w-4" strokeWidth={3} />}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { Check, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { kindsHref } from './category-menu';

/**
 * Choices as a list with a tick each, for a filter panel: bigger words
 * than tiles, and several can be chosen together (any of them shows). Each
 * row is a link that adds or takes away its choice, so the page behind
 * updates without closing the panel. Rows with nothing to show are left
 * out, unless chosen.
 */
export function TickList(props: {
  title: string;
  action: string;
  values: Record<string, string | undefined>;
  /** The parameter the choices go in, comma-separated. */
  param: string;
  options: readonly (readonly [value: string, label: string, icon: LucideIcon])[];
  counts: Map<string, number>;
  className?: string;
}) {
  const chosen = (props.values[props.param] ?? '').split(',').filter(Boolean);
  const rows = props.options.filter(([v]) => (props.counts.get(v) ?? 0) > 0 || chosen.includes(v));
  const toggle = (v: string) => kindsHref(props.action, props.values, props.param, chosen.includes(v) ? chosen.filter((c) => c !== v) : [...chosen, v]);
  if (!rows.length) return null;

  return (
    <div className={props.className}>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-harbour/60">{props.title}</h3>
        {chosen.length > 0 && (
          <Link href={kindsHref(props.action, props.values, props.param, [])} scroll={false} replace className="text-sm text-harbour/60 underline">
            Clear {chosen.length}
          </Link>
        )}
      </div>
      <ul className="divide-y divide-harbour/10 border-y border-harbour/10">
        {rows.map(([value, label, Icon]) => {
          const on = chosen.includes(value);
          return (
            <li key={value}>
              <Link href={toggle(value)} scroll={false} replace role="checkbox" aria-checked={on} className="flex min-h-[3.25rem] items-center gap-3 py-2 text-base text-ink">
                <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${on ? 'text-brand' : 'text-harbour/70'}`} strokeWidth={1.75} />
                <span className={`flex-1 ${on ? 'font-semibold' : ''}`}>{label}</span>
                <span className="text-sm tabular-nums text-harbour/50">{props.counts.get(value) ?? 0}</span>
                <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 transition-colors ${on ? 'bg-brand text-white ring-brand' : 'bg-white ring-harbour/25'}`}>
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

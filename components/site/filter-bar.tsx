import Link from 'next/link';
import { ShowToggle } from './show-toggle';

type Option = { value: string; label: string };

/** Search, a couple of selects, and the show tick, as a GET form so every view has a link. */
export function FilterBar(props: {
  action: string;
  values: Record<string, string | undefined>;
  selects: { name: string; label: string; options: Option[] }[];
  toggle: { name: string; label: string; hint: string };
  /** Values chosen elsewhere (the category tiles) that a search keeps. */
  keep?: string[];
}) {
  const active = Object.values(props.values).some(Boolean);
  return (
    <form action={props.action} className="mb-4 flex flex-wrap items-end gap-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-harbour/5">
      {props.keep?.map((k) => props.values[k] && <input key={k} type="hidden" name={k} value={props.values[k]} />)}
      <label className="flex min-w-48 flex-1 flex-col text-sm">
        <span className="mb-1 text-xs font-medium uppercase tracking-wide text-harbour/60">Search</span>
        <input name="q" defaultValue={props.values.q ?? ''} placeholder="Name or venue" className="rounded border border-harbour/20 px-3 py-2" />
      </label>
      {props.selects.map((s) => (
        <label key={s.name} className="flex flex-col text-sm">
          <span className="mb-1 text-xs font-medium uppercase tracking-wide text-harbour/60">{s.label}</span>
          <select name={s.name} defaultValue={props.values[s.name] ?? ''} className="rounded border border-harbour/20 bg-white px-3 py-2">
            <option value="">Any</option>
            {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      ))}
      <button type="submit" className="rounded bg-harbour px-4 py-2 text-sm font-medium text-white hover:bg-sea">Show</button>
      {active && <Link href={props.action} className="py-2 text-sm text-harbour/60 underline">Clear</Link>}
      <div className="w-full border-t border-harbour/10 pt-3">
        <ShowToggle name={props.toggle.name} label={props.toggle.label} hint={props.toggle.hint} checked={props.values[props.toggle.name] === '1'} />
      </div>
    </form>
  );
}

export function monthOptions(count = 12): Option[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    return { value: d.toISOString().slice(0, 7), label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) };
  });
}

export function monthHeading(iso: string): string {
  return new Date(`${iso.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

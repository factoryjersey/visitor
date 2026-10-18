import Link from 'next/link';

type Option = { value: string; label: string };

/** A plain GET form: filters live in the URL, so a view can be shared or bookmarked. */
export function Filters(props: {
  action: string;
  values: Record<string, string | undefined>;
  selects: { name: string; label: string; options: Option[] }[];
  checkbox?: { name: string; label: string };
}) {
  return (
    <form action={props.action} className="no-print mb-4 flex flex-wrap items-end gap-3 rounded border border-stone-200 bg-white p-3 text-sm">
      <label className="flex flex-col">
        <span className="text-xs text-stone-500">Search</span>
        <input name="q" defaultValue={props.values.q ?? ''} className="rounded border border-stone-300 px-2 py-1" />
      </label>
      {props.selects.map((s) => (
        <label key={s.name} className="flex flex-col">
          <span className="text-xs text-stone-500">{s.label}</span>
          <select name={s.name} defaultValue={props.values[s.name] ?? ''} className="rounded border border-stone-300 px-2 py-1">
            <option value="">Any</option>
            {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      ))}
      {props.checkbox && (
        <label className="flex items-center gap-1 pb-1">
          <input type="checkbox" name={props.checkbox.name} value="1" defaultChecked={props.values[props.checkbox.name] === '1'} />
          {props.checkbox.label}
        </label>
      )}
      <button type="submit" className="rounded bg-stone-900 px-3 py-1 text-white">Filter</button>
      <Link href={props.action} className="pb-1 text-stone-500 hover:underline">Clear</Link>
    </form>
  );
}

export const INCLUSION_OPTIONS: Option[] = [
  { value: 'candidate', label: 'Undecided' },
  { value: 'included', label: 'In the guide' },
  { value: 'excluded', label: 'Left out' },
];

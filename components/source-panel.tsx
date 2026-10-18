import type { FieldSources } from '@/lib/db/schema';

/** Where the record came from and how fresh it is. Freshness is per listing, not per site. */
export function SourcePanel(props: { sourceLink: string | null; sourceModifiedAt: Date | null; fieldSources: FieldSources }) {
  const modified = props.sourceModifiedAt;
  const ageDays = modified ? Math.floor((Date.now() - modified.getTime()) / 86_400_000) : null;
  return (
    <div className="rounded border border-stone-200 bg-white p-3 text-sm">
      <h2 className="mb-2 font-medium">Source</h2>
      {props.sourceLink && (
        <p><a href={props.sourceLink} className="text-sky-700 hover:underline" target="_blank" rel="noreferrer">Visit Jersey listing ↗</a></p>
      )}
      <p className={ageDays !== null && ageDays > 365 ? 'text-amber-700' : 'text-stone-600'}>
        {modified ? `Listing last changed ${modified.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No modification date'}
        {ageDays !== null && ageDays > 365 && ' — over a year old, check before printing'}
      </p>
      <p className="mt-1 text-xs text-stone-400">{Object.keys(props.fieldSources).length} fields from source</p>
    </div>
  );
}

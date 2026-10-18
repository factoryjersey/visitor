import { setHighlight } from '@/app/actions';

/** Highlight on or off. A highlight gets a full page in the guide and leads the public listings. */
export function HighlightControl({ kind, id, highlight }: { kind: 'event' | 'experience'; id: string; highlight: boolean }) {
  return (
    <form action={setHighlight} className="flex items-center justify-between gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="highlight" value={highlight ? 'false' : 'true'} />
      <span className="text-sm">
        <span className="font-medium">{highlight ? '★ Highlight' : 'Highlight'}</span>
        <span className="block text-xs text-stone-500">Full page in the guide, featured first online.</span>
      </span>
      <button type="submit" className={highlight ? 'rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100' : 'rounded border border-amber-500 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50'}>
        {highlight ? 'Remove' : 'Make highlight'}
      </button>
    </form>
  );
}

import { saveEditorial } from '@/app/actions';

/** Our copy for the guide and a note on why it is in or out. Source copy stays alongside, untouched. */
export function EditorialForm(props: { kind: 'event' | 'venue'; id: string; guideCopy: string | null; inclusionNote: string | null; sourceCopy: string | null }) {
  return (
    <form action={saveEditorial} className="space-y-3">
      <input type="hidden" name="kind" value={props.kind} />
      <input type="hidden" name="id" value={props.id} />
      <label className="block">
        <span className="text-sm font-medium">Guide copy</span>
        <span className="ml-2 text-xs text-stone-500">Ours. Printed instead of the listing&apos;s summary when set.</span>
        <textarea
          name="guideCopy"
          defaultValue={props.guideCopy ?? ''}
          placeholder={props.sourceCopy ?? ''}
          rows={5}
          className="mt-1 w-full rounded border border-stone-300 p-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Note</span>
        <span className="ml-2 text-xs text-stone-500">Why it is in or out. Not printed.</span>
        <input name="inclusionNote" defaultValue={props.inclusionNote ?? ''} className="mt-1 w-full rounded border border-stone-300 p-2 text-sm" />
      </label>
      <button type="submit" className="rounded bg-stone-900 px-3 py-1.5 text-sm text-white">Save</button>
    </form>
  );
}

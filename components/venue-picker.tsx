import { setEventVenue } from '@/app/actions';

/** Choose the event's venue from the listings near its pin. */
export function VenuePicker(props: {
  eventId: string;
  currentId: string | null;
  locked: boolean;
  options: { id: string; name: string; metres: number }[];
}) {
  return (
    <form action={setEventVenue} className="space-y-2">
      <input type="hidden" name="id" value={props.eventId} />
      <label className="block">
        <span className="text-sm font-medium">Venue listing</span>
        <span className="ml-2 text-xs text-stone-500">{props.locked ? 'Set by hand' : 'Matched by name and pin'}</span>
        <select name="placeId" defaultValue={props.currentId ?? ''} className="mt-1 w-full rounded border border-stone-300 p-2 text-sm">
          <option value="">None — use the venue text</option>
          {props.options.map((o) => (
            <option key={o.id} value={o.id}>{o.name}{Number.isFinite(o.metres) ? ` (${Math.round(o.metres)}m)` : ''}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="rounded border border-stone-300 px-3 py-1 text-sm hover:bg-stone-100">Set venue</button>
    </form>
  );
}

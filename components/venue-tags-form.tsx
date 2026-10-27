import { saveVenueTags } from '@/app/actions';

/**
 * Tags of ours. Visitor guide featured shows on the site: the edition
 * of the printed guide a business was last featured in; so does the
 * Visitor Map edition it is on. Client is
 * internal, for the admin only: a business that has worked with us.
 */
export function VenueTagsForm({ id, recommendedIn, visitorMap, client, clientNote }: { id: string; recommendedIn: string | null; visitorMap: string | null; client: boolean; clientNote: string | null }) {
  return (
    <form action={saveVenueTags} className="space-y-2">
      <h2 className="text-sm font-medium">Tags</h2>
      <input type="hidden" name="id" value={id} />
      <label className="block">
        <span className="text-xs text-stone-500">Visitor guide featured: last featured in (shown on the site)</span>
        <input name="recommendedIn" defaultValue={recommendedIn ?? ''} placeholder="e.g. Autumn 2026; blank if not" className="mt-0.5 w-full rounded border border-stone-300 p-1.5 text-sm" />
      </label>
      <label className="block">
        <span className="text-xs text-stone-500">On the Visitor Map: edition (shown on the site)</span>
        <input name="visitorMap" defaultValue={visitorMap ?? ''} placeholder="e.g. 2026; blank if not" className="mt-0.5 w-full rounded border border-stone-300 p-1.5 text-sm" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="client" defaultChecked={client} />
        Client: has worked with us (admin only)
      </label>
      <label className="block">
        <span className="text-xs text-stone-500">Client note (admin only)</span>
        <textarea name="clientNote" defaultValue={clientNote ?? ''} rows={2} className="mt-0.5 w-full rounded border border-stone-300 p-1.5 text-sm" />
      </label>
      <button type="submit" className="rounded border border-stone-300 px-3 py-1 text-sm hover:bg-stone-100">Save tags</button>
    </form>
  );
}

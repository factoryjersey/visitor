import { saveEventPrint } from '@/app/actions';
import type { GuideEvent } from '@/lib/domain/guide-entry';

/**
 * The entry as it will print, and the fields a person can override.
 * Each box shows the computed value as its placeholder; leave it blank to keep it.
 */
export function EventPrintForm({ id, entry, computed, current }: {
  id: string;
  entry: GuideEvent | null;
  computed: { dates: string | null; times: string | null; price: string | null };
  current: { dates: string | null; times: string | null; price: string | null; line: string | null; guidePicture: boolean };
}) {
  const field = (name: string, label: string, placeholder: string | null, value: string | null) => (
    <label className="block">
      <span className="text-xs text-stone-500">{label}</span>
      <input name={name} defaultValue={value ?? ''} placeholder={placeholder ?? ''} className="mt-0.5 w-full rounded border border-stone-300 p-1.5 text-sm" />
    </label>
  );
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium">In print</h2>
      {entry ? (
        <div className="guide-page !min-h-0 !w-full !p-3 !shadow-none ring-1 ring-stone-200">
          <article className="guide-entry !mb-0">
            <p className="guide-when">{entry.dates}{entry.times && <span>{entry.times}</span>}</p>
            <h4 className="guide-title">{entry.title}</h4>
            <p>{entry.copy} {entry.price && <strong>{entry.price}</strong>}</p>
            <p className="guide-venue">{entry.venue}</p>
            {entry.address && <p>{entry.address}</p>}
            {entry.contact && <p>{entry.contact}</p>}
            {entry.website && <p className="guide-web">{entry.website}</p>}
          </article>
        </div>
      ) : (
        <p className="text-xs text-stone-500">No dates left to print.</p>
      )}
      <form action={saveEventPrint} className="space-y-2">
        <input type="hidden" name="id" value={id} />
        {field('printDates', 'Dates', computed.dates, current.dates)}
        {field('printTimes', 'Times', computed.times, current.times)}
        {field('printPrice', 'Price', computed.price, current.price)}
        {field('printLine', 'Guide snippet: two sentences, the first 80 characters or fewer and able to stand alone, both 170 or fewer', null, current.line)}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="guidePicture" defaultChecked={current.guidePicture} disabled={!entry?.imageUrl} className="mt-1" />
          <span>
            Use its picture in the guide grid
            <span className="block text-xs text-stone-500">{entry?.imageUrl ? 'Its page’s picture box shows this one ahead of the others.' : 'It has no photograph the guide can print: none, a stock or club picture, or one with words on it.'}</span>
          </span>
        </label>
        <button type="submit" className="rounded border border-stone-300 px-3 py-1 text-sm hover:bg-stone-100">Save print details</button>
      </form>
    </div>
  );
}

import { saveVenueGuide } from '@/app/actions';
import type { ListingSize } from '@/lib/db/schema';

// The guide's own sections, areas and labels, from the 2026 editions. Free text, so a new one is just typed.
const SECTIONS = ['Eat', 'Eat & Drink: Pubs', 'See', 'Do', 'Buy', 'Visit', 'Stay'];
const AREAS = ['St. Helier', 'West', 'East', 'North', 'South', 'St. Aubin', 'Gorey', 'Surf & kite', 'On the water', 'Adventure', 'Golf', 'Swim & sport', 'Riding', 'Yoga'];
const LABELS = ['CASUAL', 'CLASSIC', 'SPECIAL', 'NEW', 'GASTROPUB', 'SMALL PLATES', 'SEA VIEWS', 'BEACHSIDE', 'COFFEE', 'ITALIAN', 'SPANISH', 'ASIAN', 'TAPAS', 'PIZZA', 'CAFE'];
const SIZES: { value: ListingSize; label: string }[] = [
  { value: 'directory', label: 'Directory line' },
  { value: 'listing', label: 'Listing (1/8 page)' },
  { value: 'quarter', label: '1/4 page' },
  { value: 'half', label: '1/2 page' },
  { value: 'three-quarters', label: '3/4 page' },
  { value: 'full', label: 'Full page' },
];

export function VenueGuideForm(props: { id: string; section: string | null; defaultSection: string; area: string | null; label: string | null; size: ListingSize; guideLine: string | null }) {
  const text = (name: string, label: string, value: string | null, list: string, placeholder = '') => (
    <label className="block">
      <span className="text-xs text-stone-500">{label}</span>
      <input name={name} list={list} defaultValue={value ?? ''} placeholder={placeholder} className="mt-0.5 w-full rounded border border-stone-300 p-1.5 text-sm" />
    </label>
  );
  return (
    <form action={saveVenueGuide} className="space-y-2">
      <h2 className="text-sm font-medium">In the guide</h2>
      <input type="hidden" name="id" value={props.id} />
      {text('guideSection', 'Section', props.section, 'sections', props.defaultSection)}
      {text('guideArea', 'Area', props.area, 'areas')}
      {text('guideLabel', 'Label', props.label, 'labels')}
      <label className="block">
        <span className="text-xs text-stone-500">Size</span>
        <select name="listingSize" defaultValue={props.size} className="mt-0.5 w-full rounded border border-stone-300 p-1.5 text-sm">
          {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-xs text-stone-500">One line, for its box in the guide (written for you nightly; what you write here stays)</span>
        <textarea name="guideLine" defaultValue={props.guideLine ?? ''} rows={2} maxLength={160} className="mt-0.5 w-full rounded border border-stone-300 p-1.5 text-sm" />
      </label>
      <datalist id="sections">{SECTIONS.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="areas">{AREAS.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="labels">{LABELS.map((s) => <option key={s} value={s} />)}</datalist>
      <button type="submit" className="rounded border border-stone-300 px-3 py-1 text-sm hover:bg-stone-100">Save</button>
    </form>
  );
}

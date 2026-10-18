import { setGenre } from '@/app/actions';
import { GENRES } from '@/lib/domain/genre';

/** The genre a tour prints under on the "on demand" pages. Locked once a person sets it. */
export function GenreControl({ id, genre, locked }: { id: string; genre: string | null; locked: boolean }) {
  return (
    <form action={setGenre} className="space-y-1">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm font-medium">Genre</span>
      <span className="ml-2 text-xs text-stone-500">{locked ? 'Set by hand' : 'Suggested from the listing'}</span>
      <div className="mt-1 flex gap-2">
        <select name="genre" defaultValue={genre ?? ''} className="flex-1 rounded border border-stone-300 p-1.5 text-sm">
          <option value="">None</option>
          {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button type="submit" className="rounded border border-stone-300 px-3 text-sm hover:bg-stone-100">Set</button>
      </div>
    </form>
  );
}

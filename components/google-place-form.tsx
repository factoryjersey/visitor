import { setGooglePlace } from '@/app/actions';

/**
 * Staff: which place on Google Maps a venue is, for the reviews panel on
 * its page. The nightly match finds most; a wrong or missing one is set
 * here, and kept.
 */
export function GooglePlaceForm({ id, placeId, locked, checkedAt }: { id: string; placeId: string | null; locked: boolean; checkedAt: Date | null }) {
  const hidden = (mode: string) => (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="mode" value={mode} />
    </>
  );
  const button = 'rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100';
  return (
    <div className="space-y-2 text-sm">
      <h2 className="text-sm font-medium">Google reviews</h2>
      <p className="text-xs text-stone-500">
        {placeId ? (
          <>
            Matched{locked ? ' by hand' : ''}:{' '}
            <a href={`https://www.google.com/maps/place/?q=place_id:${placeId}`} target="_blank" rel="noopener" className="underline">check it on Google Maps ↗</a>
          </>
        ) : locked ? (
          'Switched off: no reviews panel.'
        ) : checkedAt ? (
          `Not found on Google when last looked (${checkedAt.toISOString().slice(0, 10)}); tried again monthly.`
        ) : (
          'Not looked for yet: the nightly import will.'
        )}
      </p>
      <form action={setGooglePlace} className="flex gap-1">
        {hidden('set')}
        <input name="placeId" defaultValue={placeId ?? ''} placeholder="Google place ID (ChIJ…)" className="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1 font-mono text-xs" />
        <button type="submit" className={button}>Set</button>
      </form>
      <div className="flex gap-1">
        <form action={setGooglePlace}>{hidden('none')}<button type="submit" className={button}>No reviews</button></form>
        {locked && <form action={setGooglePlace}>{hidden('rematch')}<button type="submit" className={button}>Let the import match it</button></form>}
      </div>
      <p className="text-xs text-stone-400">
        Find an ID with Google&apos;s{' '}
        <a href="https://developers.google.com/maps/documentation/places/web-service/place-id#find-id" target="_blank" rel="noopener" className="underline">place ID finder ↗</a>.
      </p>
    </div>
  );
}

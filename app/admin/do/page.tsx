import Link from 'next/link';
import { and, asc, eq, isNotNull, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { doActivities, places, DO_SIDES } from '@/lib/db/schema';
import { SIDE_TITLE, doFill } from '@/lib/domain/do-section';
import { addActivity, saveActivity, saveDoProvider } from './actions';

export const dynamic = 'force-dynamic';

const input = 'rounded border border-stone-300 px-2 py-1 text-sm';

/**
 * Do's activity pages and providers' key: the activities this edition
 * prints, and each provider's marker and what it offers. The hint says
 * how the activities fill the grid, so the shortlist can be trimmed or
 * added to for whole pages.
 */
export default async function DoPage() {
  const activities = await db.select().from(doActivities).orderBy(asc(doActivities.position), asc(doActivities.name));
  const providers = await db
    .select({ id: places.id, slug: places.slug, name: places.name, code: places.activityCode, activities: places.activities, area: places.guideArea, size: places.listingSize })
    .from(places)
    .where(and(eq(places.inclusion, 'included'), or(eq(places.guideSection, 'Do'), and(eq(places.category, 'do'), isNotNull(places.guideArea)), isNotNull(places.activityCode))))
    .orderBy(asc(places.activityCode), asc(places.name));
  const included = activities.filter((a) => a.included);
  const indexed = providers.filter((p) => p.code && p.activities.some((s) => included.some((a) => a.slug === s)));
  const bySide = (side: (typeof DO_SIDES)[number]) => activities.filter((a) => a.side === side);

  return (
    <>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="font-display text-2xl">Do: activities &amp; providers</h1>
        <Link href="/admin/guide" className="text-sm text-stone-600 hover:underline">Guide production →</Link>
      </div>

      <section className="mb-6 rounded border border-stone-200 bg-stone-50 p-3 text-sm">
        <p>
          <b>{included.length}</b> activities run on together, water then land, a picture a page; <b>{indexed.length}</b> providers in the key that follows them.
        </p>
        {(['grid8', 'grid16'] as const).map((g) => {
          const f = doFill(included.length, g);
          return (
            <p key={g} className="text-stone-600">
              Grid of {g === 'grid8' ? 'eight' : 'sixteen'}: {f.pages} page{f.pages === 1 ? '' : 's'}
              {f.empty ? <>, {f.empty} empty box{f.empty === 1 ? '' : 'es'} — add {f.add} or leave out {f.drop} for full pages</> : ', every page full'}
            </p>
          );
        })}
      </section>

      {DO_SIDES.map((side) => (
        <section key={side} className="mb-8">
          <h2 className="mb-2 font-display text-xl">{SIDE_TITLE[side]}</h2>
          <div className="space-y-2">
            {bySide(side).map((a) => {
              const who = providers.filter((p) => p.code && p.activities.includes(a.slug)).map((p) => p.code).sort();
              return (
                <form key={a.id} action={saveActivity} className={`grid grid-cols-[4.5rem_12rem_6rem_1fr] gap-2 rounded border p-2 ${a.included ? 'border-stone-200' : 'border-dashed border-stone-300 opacity-60'}`}>
                  <input type="hidden" name="id" value={a.id} />
                  <input name="position" type="number" defaultValue={a.position} className={input} title="Order in the run" />
                  <input name="name" defaultValue={a.name} className={input} />
                  <select name="side" defaultValue={a.side} className={input}>
                    {DO_SIDES.map((s) => <option key={s} value={s}>{s === 'water' ? 'Water' : 'Land'}</option>)}
                  </select>
                  <input name="imageUrl" defaultValue={a.image?.url ?? ''} placeholder="Picture URL (else a provider's)" className={input} />
                  <textarea name="blurb" defaultValue={a.blurb ?? ''} rows={2} className={`${input} col-span-4`} />
                  <div className="col-span-4 flex items-center gap-3 text-sm">
                    <label className="flex items-center gap-1"><input type="checkbox" name="included" defaultChecked={a.included} /> In this edition</label>
                    <span className="text-stone-500">{who.length ? who.join(' ') : 'No provider marked yet'}</span>
                    <button className="ml-auto rounded bg-stone-800 px-3 py-1 text-white">Save</button>
                  </div>
                </form>
              );
            })}
          </div>
        </section>
      ))}

      <section className="mb-8">
        <h2 className="mb-2 font-display text-xl">Add an activity</h2>
        <form action={addActivity} className="grid grid-cols-[4.5rem_12rem_6rem_1fr] gap-2 rounded border border-stone-200 p-2">
          <input name="position" type="number" defaultValue={activities.length * 10} className={input} />
          <input name="name" required placeholder="Name" className={input} />
          <select name="side" className={input}>
            {DO_SIDES.map((s) => <option key={s} value={s}>{s === 'water' ? 'Water' : 'Land'}</option>)}
          </select>
          <input name="imageUrl" placeholder="Picture URL" className={input} />
          <textarea name="blurb" rows={2} placeholder="The short piece" className={`${input} col-span-3`} />
          <button className="rounded bg-stone-800 px-3 py-1 text-sm text-white">Add</button>
        </form>
      </section>

      <section>
        <h2 className="mb-1 font-display text-xl">Providers</h2>
        <p className="mb-2 text-sm text-stone-500">
          A marker puts a provider in the key and its letters on each activity it ticks. A provider sized as a listing or directory line goes in the key instead of a box of its own; one with more space keeps its entry too.
        </p>
        <div className="space-y-1">
          {providers.map((p) => (
            <form key={p.id} action={saveDoProvider} className="flex flex-wrap items-center gap-2 border-b border-stone-100 py-1 text-sm">
              <input type="hidden" name="id" value={p.id} />
              <input name="code" defaultValue={p.code ?? ''} placeholder="—" className={`${input} w-16 font-semibold uppercase`} />
              <Link href={`/venues/${p.slug}`} className="w-56 truncate hover:underline" title={`${p.area ?? ''} · ${p.size}`}>{p.name}</Link>
              {DO_SIDES.map((side) => (
                <span key={side} className="flex flex-wrap gap-x-2">
                  {bySide(side).map((a) => (
                    <label key={a.slug} className={`flex items-center gap-0.5 ${side === 'water' ? 'text-sky-800' : 'text-emerald-800'}`}>
                      <input type="checkbox" name="activity" value={a.slug} defaultChecked={p.activities.includes(a.slug)} />{a.name}
                    </label>
                  ))}
                </span>
              ))}
              <button className="ml-auto rounded border border-stone-300 px-2 py-0.5">Save</button>
            </form>
          ))}
        </div>
      </section>
    </>
  );
}

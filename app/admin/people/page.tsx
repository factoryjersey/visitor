import { asc, inArray, sql } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { businesses, users } from '@/lib/db/schema';
import { InviteForm } from '@/components/account/invite-form';
import { People } from '@/components/account/people';
import { inviteAction, saveBusinessAction } from './actions';

export const dynamic = 'force-dynamic';

// Names spelled out: drizzle leaves columns unqualified in a subquery, and a bare "id" there is the inner table's own.
const count = (table: 'places' | 'events' | 'experiences') =>
  sql<number>`(select count(*) from ${sql.raw(table)} t where t.business_id = "businesses"."id")::int`;

const select = 'w-full rounded border border-stone-300 px-3 py-2 text-sm';

export default async function PeoplePage() {
  const user = await requireStaff();
  const [staff, bizRows, providers] = await Promise.all([
    db.select().from(users).where(inArray(users.role, ['superadmin', 'staff'])).orderBy(asc(users.email)),
    db.select({ business: businesses, venues: count('places'), events: count('events'), tours: count('experiences') }).from(businesses).orderBy(asc(businesses.name)),
    db.select().from(users).where(inArray(users.role, ['provider'])).orderBy(asc(users.email)),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="font-display text-3xl">People</h1>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Invite a provider</h2>
        <InviteForm action={inviteAction}>
          <input type="hidden" name="role" value="provider" />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-600">Business</span>
            <select name="businessId" required defaultValue="" className={select}>
              <option value="" disabled>Choose…</option>
              <option value="new">A new business…</option>
              {bizRows.map(({ business: b }) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-600">New business’s name</span>
            <input name="newBusiness" className={select} placeholder="Only for a new business" />
          </label>
        </InviteForm>
        <p className="max-w-2xl text-xs text-stone-500">
          To let a business edit a listing we already have, open the listing and choose the business under “Looked after by”.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Businesses <span className="text-stone-400">{bizRows.length}</span></h2>
        {!bizRows.length && <p className="text-sm text-stone-500">None yet. Inviting a provider to a new business makes one.</p>}
        {bizRows.map(({ business: b, venues, events: evs, tours }) => (
          <details key={b.id} className="rounded border border-stone-200 bg-white">
            <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2 p-3">
              <span className="font-medium">{b.name}</span>
              <span className="text-sm text-stone-500">
                {providers.filter((p) => p.businessId === b.id).length} people · {venues} venues · {evs} events · {tours} tours
              </span>
            </summary>
            <div className="space-y-4 border-t border-stone-100 p-3">
              <People people={providers.filter((p) => p.businessId === b.id)} actor={user} />
              <form action={saveBusinessAction} className="grid gap-2 sm:grid-cols-4">
                <input type="hidden" name="id" value={b.id} />
                {(['name', 'email', 'phone', 'website'] as const).map((f) => (
                  <label key={f} className="block">
                    <span className="mb-1 block text-xs capitalize text-stone-500">{f}</span>
                    <input name={f} defaultValue={b[f] ?? ''} required={f === 'name'} className="w-full rounded border border-stone-300 px-2 py-1 text-sm" />
                  </label>
                ))}
                <div className="sm:col-span-4"><button type="submit" className="rounded border border-stone-300 px-3 py-1 text-sm hover:bg-stone-100">Save details</button></div>
              </form>
            </div>
          </details>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Staff</h2>
        <People people={staff} actor={user} showRole />
        {user.role === 'superadmin' && (
          <div className="space-y-2 pt-2">
            <h3 className="font-medium">Invite staff</h3>
            <InviteForm action={inviteAction}>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-stone-600">Role</span>
                <select name="role" defaultValue="staff" className={select}>
                  <option value="staff">Staff: the editing side and provider accounts</option>
                  <option value="superadmin">Superadmin: also who is staff</option>
                </select>
              </label>
            </InviteForm>
          </div>
        )}
      </section>
    </div>
  );
}

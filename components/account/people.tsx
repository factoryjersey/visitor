import { disableUserAction, enableUserAction } from '@/app/team-actions';
import { canManage, type Actor } from '@/lib/auth/roles';
import type { User } from '@/lib/db/schema';
import { ResendInvite } from './invite-link';

const ROLE_LABEL = { superadmin: 'Superadmin', staff: 'Staff', provider: 'Provider' } as const;

/** People, with what each is: invited, active or switched off, and what the viewer may do about it. */
export function People({ people, actor, showRole, extra }: { people: User[]; actor: Actor & { id: string }; showRole?: boolean; extra?: (u: User) => React.ReactNode }) {
  if (!people.length) return <p className="text-sm text-stone-500">Nobody yet.</p>;
  return (
    <ul className="divide-y divide-stone-200 rounded border border-stone-200 bg-white text-sm">
      {people.map((u) => {
        const manage = canManage(actor, u);
        const state = u.disabledAt ? 'Switched off' : u.lastSignInAt ? `Last signed in ${u.lastSignInAt.toISOString().slice(0, 10)}` : 'Invited, not signed in yet';
        return (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div className="min-w-0">
              <div className="font-medium">{u.name ?? u.email}{u.id === actor.id && <span className="font-normal text-stone-500"> (you)</span>}</div>
              <div className="text-stone-500">
                {u.name && <>{u.email} · </>}
                {showRole && <>{ROLE_LABEL[u.role]} · </>}
                {state}
                {extra?.(u)}
              </div>
            </div>
            {manage && (
              <div className="flex items-center gap-3">
                {!u.lastSignInAt && !u.disabledAt && <ResendInvite userId={u.id} />}
                <form action={u.disabledAt ? enableUserAction : disableUserAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button type="submit" className="text-xs text-stone-600 hover:underline">{u.disabledAt ? 'Switch back on' : 'Switch off'}</button>
                </form>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

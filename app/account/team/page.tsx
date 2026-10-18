import { asc, eq } from 'drizzle-orm';
import { requireProvider } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { inviteColleagueAction } from '@/app/account/actions';
import { InviteForm } from '@/components/account/invite-form';
import { People } from '@/components/account/people';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const user = await requireProvider();
  const people = await db.select().from(users).where(eq(users.businessId, user.businessId)).orderBy(asc(users.createdAt));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Team</h1>
        <p className="mt-1 text-sm text-stone-600">Everybody here can add and edit your listings.</p>
      </div>
      <People people={people} actor={user} />
      <section className="space-y-2">
        <h2 className="font-display text-xl">Invite a colleague</h2>
        <InviteForm action={inviteColleagueAction} />
      </section>
    </div>
  );
}

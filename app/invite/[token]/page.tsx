import { eq } from 'drizzle-orm';
import { findInvite } from '@/lib/auth/accounts';
import { db } from '@/lib/db';
import { businesses } from '@/lib/db/schema';
import { signInWithGoogleAction } from '@/app/login/actions';
import { AcceptForm } from './accept-form';

export const dynamic = 'force-dynamic';

const ROLE_TEXT = { superadmin: 'as a superadmin', staff: 'as Visitor Guide staff', provider: 'to look after listings' } as const;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await findInvite(token);

  if (!found) {
    return (
      <Shell title="Invite no longer valid">
        <p className="text-sm text-stone-600">It has been used, replaced by a newer one, or has expired. Ask whoever invited you to send it again.</p>
      </Shell>
    );
  }

  const { account } = found;
  const [business] = account.businessId ? await db.select().from(businesses).where(eq(businesses.id, account.businessId)) : [];

  return (
    <Shell title="Welcome to the Visitor Guide">
      <p className="mb-6 text-sm text-stone-600">
        You have been invited {ROLE_TEXT[account.role]}
        {business ? <> for <strong>{business.name}</strong></> : null}, as <strong>{account.email}</strong>.
      </p>

      <form action={signInWithGoogleAction}>
        <button type="submit" className="w-full rounded border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-50">
          Continue with Google
        </button>
        <p className="mt-1 text-xs text-stone-500">Only if {account.email} is a Google account.</p>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-stone-400">
        <span className="h-px flex-1 bg-stone-200" />or set a password<span className="h-px flex-1 bg-stone-200" />
      </div>

      <AcceptForm token={token} name={account.name} />
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center bg-stone-50 px-4">
      <div className="rounded border border-stone-200 bg-white p-8">
        <h1 className="mb-3 font-display text-2xl">{title}</h1>
        {children}
      </div>
    </div>
  );
}

'use client';

import { useActionState } from 'react';
import { resendInviteAction } from '@/app/team-actions';

/** Shows an invite link once, to copy and send: we do not email it ourselves. */
export function CopyLink({ link }: { link: string }) {
  return (
    <div className="space-y-1">
      <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="w-full rounded border border-stone-300 bg-stone-50 px-2 py-1 font-mono text-xs" />
      <p className="text-xs text-stone-500">Send them this link. It works once, for 14 days. We will not show it again.</p>
    </div>
  );
}

export function ResendInvite({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resendInviteAction, null);
  if (state?.link) return <CopyLink link={state.link} />;
  return (
    <form action={action} className="inline">
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending} className="text-xs text-stone-600 hover:underline disabled:opacity-50">New invite link</button>
      {state?.error && <span className="ml-2 text-xs text-red-700">{state.error}</span>}
    </form>
  );
}

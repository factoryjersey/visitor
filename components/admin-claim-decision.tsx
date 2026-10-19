'use client';

import { useActionState } from 'react';
import { decideClaimAction, type DecisionState } from '@/app/admin/claims/actions';
import { CopyLink } from '@/components/account/invite-link';

type Option = { id: string; name: string };

/**
 * Approve or turn down one claim. The business to give it to defaults to
 * the person's own, if they have an account, else a suggested match,
 * else a new one named as they named it.
 */
export function ClaimDecision(props: {
  claimId: string;
  email: string;
  isVenue: boolean;
  businessName: string;
  accountBusiness: Option | null;
  suggestions: Option[];
  businesses: Option[];
}) {
  const [state, action, pending] = useActionState<DecisionState, FormData>(decideClaimAction, null);

  if (state && 'done' in state) {
    if (state.done === 'rejected') return <p className="text-sm text-stone-500">Turned down{state.emailed ? ' and told by email' : ''}.</p>;
    const subject = encodeURIComponent('Your Visitor listing');
    const body = state.invite
      ? encodeURIComponent(`Hello,\n\nYour claim has been approved. Set up your account here to update your listing and add what you have coming up:\n\n${state.invite.link}\n\nThe link works once, for 14 days.\n\nVisitor`)
      : '';
    return (
      <div className="space-y-2 rounded-md bg-emerald-50 p-3 text-sm ring-1 ring-emerald-200">
        <p className="text-emerald-900">
          Approved: {state.listings > 0 ? `${state.listings} listing${state.listings === 1 ? '' : 's'} now with ` : 'account for '}
          <strong>{state.businessName}</strong>.
        </p>
        {state.invite ? (
          <>
            <CopyLink link={state.invite.link} emailedTo={state.emailed ? state.invite.email : null} />
            {!state.emailed && (
              <a href={`mailto:${state.invite.email}?subject=${subject}&body=${body}`} className="inline-block text-xs font-medium text-emerald-800 hover:underline">
                Email it to {state.invite.email} →
              </a>
            )}
          </>
        ) : (
          <p className="text-xs text-emerald-800">They already have an account: it is in their listings now{state.emailed ? ', and we have emailed to say so' : ''}.</p>
        )}
      </div>
    );
  }

  const preferred = props.accountBusiness?.id ?? props.suggestions[0]?.id ?? 'new';
  const others = props.businesses.filter((b) => b.id !== props.accountBusiness?.id && !props.suggestions.some((s) => s.id === b.id));

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="claimId" value={props.claimId} />
      <label className="block text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-stone-500">Give it to</span>
        <select name="businessId" defaultValue={preferred} className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 text-sm">
          {props.accountBusiness && <option value={props.accountBusiness.id}>{props.accountBusiness.name} (their business)</option>}
          {!props.accountBusiness && <option value="new">A new business: {props.businessName}</option>}
          {!props.accountBusiness && props.suggestions.length > 0 && (
            <optgroup label="Might be">
              {props.suggestions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </optgroup>
          )}
          {!props.accountBusiness && others.length > 0 && (
            <optgroup label="All businesses">
              {others.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </optgroup>
          )}
        </select>
      </label>
      {props.isVenue && (
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" name="withVenueEvents" defaultChecked /> And the upcoming events at this venue that nobody looks after
        </label>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button name="decision" value="approve" disabled={pending} className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
          Approve
        </button>
        <input name="note" placeholder="Why not (for our records)" className="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1.5 text-sm" />
        <button name="decision" value="reject" disabled={pending} className="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-50">
          Turn down
        </button>
      </div>
      {state && 'error' in state && <p className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}

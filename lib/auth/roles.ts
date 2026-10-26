import type { Role } from '@/lib/db/schema';

/**
 * Who may do what. Pure, so the rules are tested rather than read.
 *
 *   superadmin  everything, and the only one who makes staff
 *   staff       the editing side, and provider accounts for any business
 *   provider    their own business's listings, and colleagues at it
 */

export type Actor = { role: Role; businessId: string | null };

export const isStaff = (role: Role) => role === 'superadmin' || role === 'staff';

/** Where somebody lands after signing in. */
export const homeFor = (role: Role) => (isStaff(role) ? '/admin' : '/account');

/** Whether `actor` may invite somebody as `role`, to `businessId`. */
export function canInvite(actor: Actor, target: { role: Role; businessId: string | null }): boolean {
  if (target.role === 'provider' && !target.businessId) return false;
  if (target.role !== 'provider' && target.businessId) return false;
  if (actor.role === 'superadmin') return true;
  if (actor.role === 'staff') return target.role === 'provider';
  return target.role === 'provider' && !!actor.businessId && target.businessId === actor.businessId;
}

/** Whether `actor` may change somebody else's account: disable it, re-send its invite. */
export function canManage(actor: Actor & { id: string }, other: { id: string; role: Role; businessId: string | null }): boolean {
  if (actor.id === other.id) return false;
  return canInvite(actor, other);
}

/** A provider sees and edits only what belongs to their business; staff, everything. */
export function canEditListing(actor: Actor, listing: { businessId: string | null }): boolean {
  if (isStaff(actor.role)) return true;
  return !!actor.businessId && listing.businessId === actor.businessId;
}

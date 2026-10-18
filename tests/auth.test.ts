import { describe, expect, it } from 'vitest';
import { isEmailListed, safeNext } from '@/lib/auth/permissions';
import { isProtectedPath } from '@/lib/auth/public-paths';
import { canEditListing, canInvite, canManage, homeFor, isStaff } from '@/lib/auth/roles';

describe('isProtectedPath', () => {
  it('protects the editing side and a provider’s pages, and nothing else', () => {
    expect(isProtectedPath('/admin')).toBe(true);
    expect(isProtectedPath('/admin/guide/export/whats-on.csv')).toBe(true);
    expect(isProtectedPath('/account')).toBe(true);
    expect(isProtectedPath('/account/venues/new')).toBe(true);
    expect(isProtectedPath('/administrator')).toBe(false);
    expect(isProtectedPath('/accounts')).toBe(false);
    expect(isProtectedPath('/whats-on')).toBe(false);
    expect(isProtectedPath('/login')).toBe(false);
    expect(isProtectedPath('/invite/abc')).toBe(false);
    expect(isProtectedPath('/')).toBe(false);
  });
});

describe('isEmailListed', () => {
  it('matches whole addresses, case-insensitively', () => {
    expect(isEmailListed('Ben@Factory.je', 'ben@factory.je')).toBe(true);
    expect(isEmailListed('ben@factory.je', 'a@factory.je, ben@factory.je')).toBe(true);
    expect(isEmailListed('en@factory.je', 'ben@factory.je')).toBe(false);
    expect(isEmailListed('ben@factory.je.evil.com', 'ben@factory.je')).toBe(false);
  });

  it('lists nobody when unset', () => {
    expect(isEmailListed('ben@factory.je', undefined)).toBe(false);
    expect(isEmailListed('ben@factory.je', '')).toBe(false);
  });
});

describe('safeNext', () => {
  it('keeps only same-origin paths', () => {
    expect(safeNext('/whats-on?month=2026-11')).toBe('/whats-on?month=2026-11');
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('/\\evil.com')).toBe('/');
    expect(safeNext('https://evil.com')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });
});

describe('roles', () => {
  const superadmin = { id: 's', role: 'superadmin' as const, businessId: null };
  const staff = { id: 't', role: 'staff' as const, businessId: null };
  const provider = { id: 'p', role: 'provider' as const, businessId: 'b1' };

  it('sends staff to the admin and providers to their account', () => {
    expect(homeFor('superadmin')).toBe('/admin');
    expect(homeFor('staff')).toBe('/admin');
    expect(homeFor('provider')).toBe('/account');
    expect(isStaff('provider')).toBe(false);
  });

  it('lets only a superadmin make staff', () => {
    expect(canInvite(superadmin, { role: 'staff', businessId: null })).toBe(true);
    expect(canInvite(superadmin, { role: 'superadmin', businessId: null })).toBe(true);
    expect(canInvite(staff, { role: 'staff', businessId: null })).toBe(false);
    expect(canInvite(staff, { role: 'superadmin', businessId: null })).toBe(false);
    expect(canInvite(provider, { role: 'staff', businessId: null })).toBe(false);
  });

  it('lets staff invite providers anywhere, and providers only to their own business', () => {
    expect(canInvite(staff, { role: 'provider', businessId: 'b2' })).toBe(true);
    expect(canInvite(provider, { role: 'provider', businessId: 'b1' })).toBe(true);
    expect(canInvite(provider, { role: 'provider', businessId: 'b2' })).toBe(false);
    expect(canInvite({ role: 'provider', businessId: null }, { role: 'provider', businessId: null })).toBe(false);
  });

  it('needs a business for a provider and none for staff', () => {
    expect(canInvite(superadmin, { role: 'provider', businessId: null })).toBe(false);
    expect(canInvite(superadmin, { role: 'staff', businessId: 'b1' })).toBe(false);
  });

  it('never lets somebody manage themselves', () => {
    expect(canManage(superadmin, superadmin)).toBe(false);
    expect(canManage(staff, { id: 'x', role: 'provider', businessId: 'b9' })).toBe(true);
    expect(canManage(staff, superadmin)).toBe(false);
    expect(canManage(provider, { id: 'y', role: 'provider', businessId: 'b1' })).toBe(true);
  });

  it('keeps a provider to their own listings', () => {
    expect(canEditListing(provider, { businessId: 'b1' })).toBe(true);
    expect(canEditListing(provider, { businessId: 'b2' })).toBe(false);
    expect(canEditListing(provider, { businessId: null })).toBe(false);
    expect(canEditListing(staff, { businessId: null })).toBe(true);
  });
});

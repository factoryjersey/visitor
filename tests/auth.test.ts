import { describe, expect, it } from 'vitest';
import { isEmailDomainAllowed, safeNext } from '@/lib/auth/permissions';
import { isProtectedPath } from '@/lib/auth/public-paths';

describe('isProtectedPath', () => {
  it('protects the editing side and nothing else', () => {
    expect(isProtectedPath('/admin')).toBe(true);
    expect(isProtectedPath('/admin/guide/export/whats-on.csv')).toBe(true);
    expect(isProtectedPath('/administrator')).toBe(false);
    expect(isProtectedPath('/whats-on')).toBe(false);
    expect(isProtectedPath('/login')).toBe(false);
    expect(isProtectedPath('/')).toBe(false);
  });
});

describe('isEmailDomainAllowed', () => {
  it('matches whole domains, case-insensitively', () => {
    expect(isEmailDomainAllowed('Ben@Factory.je', 'factory.je')).toBe(true);
    expect(isEmailDomainAllowed('a@notfactory.je', 'factory.je')).toBe(false);
    expect(isEmailDomainAllowed('a@factory.je.evil.com', 'factory.je')).toBe(false);
    expect(isEmailDomainAllowed('a@jersey.com', 'factory.je, jersey.com')).toBe(true);
  });

  it('allows anyone when unset', () => {
    expect(isEmailDomainAllowed('a@example.com', undefined)).toBe(true);
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

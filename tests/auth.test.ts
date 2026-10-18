import { describe, expect, it } from 'vitest';
import { isEmailDomainAllowed, safeNext } from '@/lib/auth/permissions';
import { isPublicPath } from '@/lib/auth/public-paths';

describe('isPublicPath', () => {
  it('opens only the sign-in flow', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/auth/callback')).toBe(true);
    expect(isPublicPath('/logout')).toBe(true);
    expect(isPublicPath('/loginx')).toBe(false);
    expect(isPublicPath('/guide')).toBe(false);
    expect(isPublicPath('/')).toBe(false);
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

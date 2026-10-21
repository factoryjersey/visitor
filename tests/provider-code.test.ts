import { describe, expect, it } from 'vitest';
import { fillCodes, providerCode } from '@/lib/domain/provider-code';

describe('provider key codes', () => {
  it('takes the initials, leaving out small words and marks', () => {
    expect(providerCode('The Club Hotel & Spa', new Set())).toBe('CHS');
    expect(providerCode('Intertidal Walks with Lou', new Set())).toBe('IWL');
    expect(providerCode('La Côte Distillery', new Set())).toBe('LCD');
    expect(providerCode('Strive', new Set())).toBe('ST');
  });

  it('gives up another letter of the first word when the code is taken', () => {
    expect(providerCode('Roccos Activity Centre', new Set(['RAC']))).toBe('ROAC');
  });

  it('fills only the providers without a code, never two the same', () => {
    const codes = fillCodes([
      { id: '1', name: 'Valley Adventure Centre', code: 'VAC' },
      { id: '2', name: 'Valley Art Club', code: null },
      { id: '3', name: 'Vale Arts Collective', code: null },
    ]);
    expect(new Set([...codes.values(), 'VAC']).size).toBe(3);
    expect(codes.has('1')).toBe(false);
  });
});

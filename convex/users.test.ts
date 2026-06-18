import { describe, expect, it } from 'vitest';
import { resolveProfileCountry } from './users';

describe('resolveProfileCountry', () => {
  it('preserves an existing real country when stale local sync sends GLOBAL', () => {
    expect(
      resolveProfileCountry(
        { countryCode: 'EG', countryName: 'Egypt' } as any,
        { countryCode: 'GLOBAL', countryName: 'Earth' }
      )
    ).toEqual({ countryCode: 'EG', countryName: 'Egypt' });
  });

  it('accepts a new real country from profile edits', () => {
    expect(
      resolveProfileCountry(
        { countryCode: 'EG', countryName: 'Egypt' } as any,
        { countryCode: 'SA', countryName: 'Saudi Arabia' }
      )
    ).toEqual({ countryCode: 'SA', countryName: 'Saudi Arabia' });
  });
});

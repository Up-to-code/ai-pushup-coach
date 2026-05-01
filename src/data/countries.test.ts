import { describe, expect, it } from 'vitest';
import { COUNTRY_OPTIONS, getCountryByCode } from './countries';

describe('country options', () => {
  it('includes global plus a broad ISO country set', () => {
    expect(COUNTRY_OPTIONS[0]).toEqual({ code: 'GLOBAL', name: 'Earth' });
    expect(COUNTRY_OPTIONS.length).toBeGreaterThan(240);
    expect(getCountryByCode('EG')).toMatchObject({ code: 'EG', name: 'Egypt' });
    expect(getCountryByCode('US')).toMatchObject({ code: 'US', name: 'United States' });
  });

  it('falls back to global for missing country codes', () => {
    expect(getCountryByCode('NOPE')).toEqual({ code: 'GLOBAL', name: 'Earth' });
  });
});

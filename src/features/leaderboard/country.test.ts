import { describe, expect, it } from 'vitest';
import {
  normalizeLeaderboardCountryCode,
  resolveLeaderboardCountryCode,
} from './country';

describe('leaderboard country selection', () => {
  it('normalizes blank country codes to global', () => {
    expect(normalizeLeaderboardCountryCode(' us ')).toBe('US');
    expect(normalizeLeaderboardCountryCode('')).toBe('GLOBAL');
    expect(normalizeLeaderboardCountryCode(undefined)).toBe('GLOBAL');
  });

  it('uses the local country for guest users', () => {
    expect(
      resolveLeaderboardCountryCode({
        isSignedIn: false,
        localCountryCode: 'eg',
        remoteCountryCode: 'GLOBAL',
      })
    ).toBe('EG');
  });

  it('uses the backend country for signed-in users when it is set', () => {
    expect(
      resolveLeaderboardCountryCode({
        isSignedIn: true,
        localCountryCode: 'EG',
        remoteCountryCode: 'US',
      })
    ).toBe('US');
  });

  it('falls back to the local country while the backend profile is still global', () => {
    expect(
      resolveLeaderboardCountryCode({
        isSignedIn: true,
        localCountryCode: 'EG',
        remoteCountryCode: 'GLOBAL',
      })
    ).toBe('EG');
  });
});

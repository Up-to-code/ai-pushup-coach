import { describe, expect, it } from 'vitest';
import { buildProfileFromBetterAuthUser, type BetterAuthUserDoc } from './leaderboardProfiles';

function authUser(overrides: Partial<BetterAuthUserDoc> = {}): BetterAuthUserDoc {
  return {
    _id: 'auth-user-1',
    name: 'Auth Athlete',
    email: 'athlete@example.com',
    image: null,
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe('Better Auth leaderboard profile defaults', () => {
  it('does not overwrite an existing real country when auth profile is ensured', () => {
    const profile = buildProfileFromBetterAuthUser(authUser(), {
      countryCode: 'JP',
      countryName: 'Japan',
    });

    expect(profile.countryCode).toBe('JP');
    expect(profile.countryName).toBe('Japan');
  });

  it('defaults new auth-only profiles to global until the user chooses a country', () => {
    const profile = buildProfileFromBetterAuthUser(authUser({ createdAt: 0 }));

    expect(profile.countryCode).toBe('GLOBAL');
    expect(profile.countryName).toBe('Earth');
  });
});

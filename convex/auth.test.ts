import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAccountOptions,
  getAppleProfileEmail,
  getSocialProviders,
  mapAppleProfileToUser,
  requireMatchingIdentity,
} from './auth';

function ctxWithSubject(subject: string | null) {
  return {
    auth: {
      getUserIdentity: vi.fn(async () => (subject ? { subject } : null)),
    },
  };
}

describe('requireMatchingIdentity', () => {
  it('returns the identity when the authenticated subject, not email, matches the requested user', async () => {
    const appleBackedBetterAuthUserId = 'user_123';
    const ctx = ctxWithSubject(appleBackedBetterAuthUserId);

    await expect(requireMatchingIdentity(ctx as any, appleBackedBetterAuthUserId)).resolves.toEqual({
      subject: appleBackedBetterAuthUserId,
    });
    expect(ctx.auth.getUserIdentity).toHaveBeenCalledOnce();
  });

  it('rejects unauthenticated calls', async () => {
    const ctx = ctxWithSubject(null);

    await expect(requireMatchingIdentity(ctx as any, 'user_123')).rejects.toThrow(
      'Authentication required.'
    );
  });

  it('rejects calls for a different user id', async () => {
    const ctx = ctxWithSubject('user_123');

    await expect(requireMatchingIdentity(ctx as any, 'user_456')).rejects.toThrow(
      'Authenticated user does not match requested user.'
    );
  });
});

describe('getSocialProviders', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers Apple and Google when credentials are present', () => {
    vi.stubEnv('APPLE_CLIENT_ID', 'com.example.pushcounter.oauth');
    vi.stubEnv('APPLE_CLIENT_SECRET', 'apple-secret');
    vi.stubEnv('APPLE_APP_BUNDLE_IDENTIFIER', 'com.aipushupcoach.app');
    vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-secret');

    expect(getSocialProviders()).toEqual({
      apple: expect.objectContaining({
        clientId: 'com.example.pushcounter.oauth',
        clientSecret: 'apple-secret',
        appBundleIdentifier: 'com.aipushupcoach.app',
        mapProfileToUser: expect.any(Function),
      }),
      google: {
        clientId: 'google-client',
        clientSecret: 'google-secret',
      },
    });
  });

  it('registers Google by itself', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-secret');

    expect(getSocialProviders()).toEqual({
      google: {
        clientId: 'google-client',
        clientSecret: 'google-secret',
      },
    });
  });

  it('passes through the native Apple app bundle identifier for id token validation', () => {
    vi.stubEnv('APPLE_CLIENT_ID', 'com.example.pushcounter.oauth');
    vi.stubEnv('APPLE_CLIENT_SECRET', 'apple-secret');
    vi.stubEnv('APPLE_APP_BUNDLE_IDENTIFIER', 'com.aipushupcoach.app');

    expect(getSocialProviders()?.apple).toMatchObject({
      clientId: 'com.example.pushcounter.oauth',
      clientSecret: 'apple-secret',
      appBundleIdentifier: 'com.aipushupcoach.app',
      mapProfileToUser: expect.any(Function),
    });
  });

  it('maps Apple profiles with missing email to a deterministic internal fallback', () => {
    expect(getAppleProfileEmail({ sub: 'apple-user-123', email: null })).toBe(
      'apple-apple-user-123@users.pushcounter.local'
    );
    expect(mapAppleProfileToUser({ sub: 'apple:user/123', email: null, name: null })).toEqual({
      email: 'apple-apple-user-123@users.pushcounter.local',
      name: 'Athlete',
    });
  });

  it('keeps Apple profile email and name when Apple provides them', () => {
    expect(
      mapAppleProfileToUser({
        sub: 'apple-user-123',
        email: 'athlete@example.com',
        name: 'Ahmed Mansour',
      })
    ).toEqual({
      email: 'athlete@example.com',
      name: 'Ahmed Mansour',
    });
  });
});

describe('getAccountOptions', () => {
  it('disables implicit email-based OAuth account linking', () => {
    expect(getAccountOptions()).toEqual({
      accountLinking: {
        disableImplicitLinking: true,
      },
    });
  });
});

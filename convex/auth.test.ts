import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAccountOptions, getSocialProviders, requireMatchingIdentity } from './auth';

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

  it('registers only Apple, even when Google credentials are present', () => {
    vi.stubEnv('APPLE_CLIENT_ID', 'com.example.pushcounter.oauth');
    vi.stubEnv('APPLE_CLIENT_SECRET', 'apple-secret');
    vi.stubEnv('APPLE_APP_BUNDLE_IDENTIFIER', 'com.example.pushcounter');
    vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-secret');

    expect(getSocialProviders()).toEqual({
      apple: {
        clientId: 'com.example.pushcounter.oauth',
        clientSecret: 'apple-secret',
        appBundleIdentifier: 'com.example.pushcounter',
      },
    });
  });

  it('does not register Google by itself', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-secret');

    expect(getSocialProviders()).toEqual({});
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

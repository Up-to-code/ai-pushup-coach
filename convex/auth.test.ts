import { describe, expect, it, vi } from 'vitest';
import { requireMatchingIdentity } from './auth';

function ctxWithSubject(subject: string | null) {
  return {
    auth: {
      getUserIdentity: vi.fn(async () => (subject ? { subject } : null)),
    },
  };
}

describe('requireMatchingIdentity', () => {
  it('returns the identity when the authenticated subject matches the requested user', async () => {
    const ctx = ctxWithSubject('user_123');

    await expect(requireMatchingIdentity(ctx as any, 'user_123')).resolves.toEqual({
      subject: 'user_123',
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

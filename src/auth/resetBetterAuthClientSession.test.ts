import { describe, expect, it, vi } from 'vitest';
import { resetBetterAuthClientSession } from './resetBetterAuthClientSession';
import { authClient } from './authClient';
import { clearBetterAuthExpoCache } from './betterAuthExpoStorage';
import { detachSubscriptionIdentity } from '../subscriptions/adapty';

vi.mock('./authClient', () => ({
  authClient: {
    signOut: vi.fn(async () => undefined),
    $store: {
      notify: vi.fn(),
    },
  },
}));

vi.mock('./betterAuthExpoStorage', () => ({
  clearBetterAuthExpoCache: vi.fn(async () => undefined),
}));

vi.mock('../subscriptions/adapty', () => ({
  detachSubscriptionIdentity: vi.fn(async () => undefined),
}));

describe('resetBetterAuthClientSession', () => {
  it('signs out, detaches subscriptions, clears native auth cache, notifies session state, and refetches', async () => {
    const refreshSession = vi.fn(async () => null);

    await resetBetterAuthClientSession({ refreshSession });

    expect(authClient.signOut).toHaveBeenCalledOnce();
    expect(detachSubscriptionIdentity).toHaveBeenCalledOnce();
    expect(clearBetterAuthExpoCache).toHaveBeenCalledOnce();
    expect(authClient.$store.notify).toHaveBeenCalledWith('$sessionSignal');
    expect(refreshSession).toHaveBeenCalledOnce();
  });
});

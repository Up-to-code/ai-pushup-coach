import { detachSubscriptionIdentity } from '../subscriptions/adapty';
import { authClient } from './authClient';
import { clearBetterAuthExpoCache } from './betterAuthExpoStorage';

type ResetBetterAuthClientSessionOptions = {
  refreshSession?: () => Promise<unknown>;
};

export async function resetBetterAuthClientSession(options: ResetBetterAuthClientSessionOptions = {}) {
  try {
    await authClient.signOut();
  } catch (error) {
    console.warn('Better Auth sign-out during reset failed', error);
  }

  try {
    await detachSubscriptionIdentity();
  } catch (error) {
    console.warn('Subscription identity reset failed', error);
  }

  await clearBetterAuthExpoCache();
  authClient.$store.notify('$sessionSignal');

  if (options.refreshSession) {
    await options.refreshSession();
  }
}

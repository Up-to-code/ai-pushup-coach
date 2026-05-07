import { describe, expect, it, vi } from 'vitest';
import * as SecureStore from 'expo-secure-store';
import {
  betterAuthExpoCookieKey,
  betterAuthExpoSessionDataKey,
  clearBetterAuthExpoCache,
} from './betterAuthExpoStorage';

vi.mock('expo-secure-store', () => ({
  deleteItemAsync: vi.fn(async () => undefined),
}));

describe('clearBetterAuthExpoCache', () => {
  it('deletes Better Auth Expo cookie and session cache keys', async () => {
    await clearBetterAuthExpoCache();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(betterAuthExpoCookieKey);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(betterAuthExpoSessionDataKey);
  });
});

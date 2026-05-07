import * as SecureStore from 'expo-secure-store';

export const betterAuthExpoCookieKey = 'pushcounter_cookie';
export const betterAuthExpoSessionDataKey = 'pushcounter_session_data';

export async function clearBetterAuthExpoCache() {
  await Promise.all([
    SecureStore.deleteItemAsync(betterAuthExpoCookieKey),
    SecureStore.deleteItemAsync(betterAuthExpoSessionDataKey),
  ]);
}

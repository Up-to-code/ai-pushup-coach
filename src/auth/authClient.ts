import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { authBaseUrl } from '../config/links';

const scheme = Constants.expoConfig?.scheme ?? 'pushcounter';
if (!authBaseUrl) {
  throw new Error('Missing EXPO_PUBLIC_AUTH_BASE_URL or EXPO_PUBLIC_WEB_URL in your Expo environment.');
}

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [
    expoClient({
      scheme: Array.isArray(scheme) ? scheme[0] : scheme,
      storagePrefix: 'pushcounter',
      storage: SecureStore,
    }),
    convexClient(),
  ],
});

import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuthActionStore } from './authActionStore';
import { clearBetterAuthExpoCache } from './betterAuthExpoStorage';
import { clearLocalAuthState } from './clearLocalAuthState';
import { authClient } from './authClient';
import { resolveAuthStatus } from './authState';
import { resetBetterAuthClientSession } from './resetBetterAuthClientSession';
import { useBetterAuth } from './useBetterAuth';
import { useSettingsHydrated } from './useSettingsHydrated';
import { authCallbackUrl } from '../config/links';
import { usePlanStore, useSettingsStore, useUserStore } from '../store';

function isAppleAuthCancel(error: unknown) {
  return (
    error instanceof Error &&
    'code' in error &&
    (error.code === 'ERR_REQUEST_CANCELED' ||
      error.code === 'ERR_REQUEST_CANCELLED' ||
      error.code === 'ERR_CANCELED')
  );
}

function getAppleUserPayload(credential: AppleAuthentication.AppleAuthenticationCredential) {
  const firstName = credential.fullName?.givenName ?? undefined;
  const lastName = credential.fullName?.familyName ?? undefined;

  if (!credential.email && !firstName && !lastName) {
    return undefined;
  }

  return {
    email: credential.email ?? undefined,
    name: firstName || lastName ? { firstName, lastName } : undefined,
  };
}

function getAuthResultError(result: unknown) {
  return (result as { error?: { message?: string; code?: string } } | null)?.error;
}

async function clearProviderCacheSafely() {
  try {
    await clearBetterAuthExpoCache();
  } catch (error) {
    console.warn('Better Auth Expo cache cleanup failed', error);
  }
}

export function useAuth() {
  const betterAuth = useBetterAuth();
  const { isAuthenticated: isConvexAuthenticated, isLoading: convexLoading } = useConvexAuth();
  const authActionStatus = useAuthActionStore((state) => state.authActionStatus);
  const setAuthActionStatus = useAuthActionStore((state) => state.setAuthActionStatus);
  const settingsHydrated = useSettingsHydrated();
  const allowGuestMode = useSettingsStore((state) => state.settings.allowGuestMode);
  const setAllowGuestMode = useSettingsStore((state) => state.setAllowGuestMode);
  const hasLocalPlan = usePlanStore((state) => Boolean(state.plan));
  const localUser = useUserStore((state) => state.user);

  const deletionState = useQuery(
    api.users.deletionStatus,
    betterAuth.isLoaded && betterAuth.isSignedIn && isConvexAuthenticated && betterAuth.userId
      ? { clientUserId: betterAuth.userId }
      : 'skip'
  );

  const status = resolveAuthStatus({
    authLoaded: betterAuth.isLoaded,
    settingsHydrated,
    isSignedIn: betterAuth.isSignedIn,
    allowGuestMode,
    clientUserId: betterAuth.userId,
    deletionState,
  });
  const deletionLoading = Boolean(
    betterAuth.isSignedIn &&
      betterAuth.userId &&
      (convexLoading || !isConvexAuthenticated || deletionState === undefined)
  );

  const finishProviderSignIn = useCallback(async (result: unknown, missingSessionIsCancel: boolean) => {
    const error = getAuthResultError(result);
    if (error) {
      await clearProviderCacheSafely();
      return { error };
    }

    setAuthActionStatus('settling');
    const session = await betterAuth.refreshSession();
    if (!session) {
      await clearProviderCacheSafely();
      if (missingSessionIsCancel) {
        return { error: null };
      }
      return {
        error: {
          message: 'Sign in did not finish. Please try again.',
          code: 'AUTH_SESSION_MISSING',
        },
      };
    }

    return result as { error?: null };
  }, [betterAuth, setAuthActionStatus]);

  const resetForProviderSignIn = useCallback(async () => {
    setAllowGuestMode(false);
    await resetBetterAuthClientSession({ refreshSession: betterAuth.refreshSession });
    if (!hasLocalPlan) {
      await clearLocalAuthState();
    }
  }, [betterAuth.refreshSession, hasLocalPlan, setAllowGuestMode]);

  const signInWithApple = useCallback(async () => {
    setAuthActionStatus('signingIn');

    try {
      await resetForProviderSignIn();

      if (Platform.OS !== 'ios' || !(await AppleAuthentication.isAvailableAsync())) {
        const result = await authClient.signIn.social({ provider: 'apple', callbackURL: authCallbackUrl });
        return finishProviderSignIn(result, true);
      }

      let credential: AppleAuthentication.AppleAuthenticationCredential;
      try {
        credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
      } catch (error) {
        if (isAppleAuthCancel(error)) {
          await clearProviderCacheSafely();
          return { error: null };
        }
        throw error;
      }

      if (!credential.identityToken) {
        await clearProviderCacheSafely();
        return {
          error: {
            message: 'Apple did not return a secure sign-in token. Please try again.',
            code: 'APPLE_IDENTITY_TOKEN_MISSING',
          },
        };
      }

      const result = await authClient.signIn.social({
        provider: 'apple',
        idToken: {
          token: credential.identityToken,
          user: getAppleUserPayload(credential),
        },
        callbackURL: authCallbackUrl,
      });
      return finishProviderSignIn(result, false);
    } catch (error) {
      await clearProviderCacheSafely();
      throw error;
    } finally {
      setAuthActionStatus('idle');
    }
  }, [finishProviderSignIn, resetForProviderSignIn, setAuthActionStatus]);

  const signInWithGoogle = useCallback(async () => {
    setAuthActionStatus('signingIn');

    try {
      await resetForProviderSignIn();
      const result = await authClient.signIn.social({ provider: 'google', callbackURL: authCallbackUrl });
      return finishProviderSignIn(result, true);
    } catch (error) {
      await clearProviderCacheSafely();
      throw error;
    } finally {
      setAuthActionStatus('idle');
    }
  }, [finishProviderSignIn, resetForProviderSignIn, setAuthActionStatus]);

  const continueAsGuest = useCallback(() => {
    setAllowGuestMode(true);
  }, [setAllowGuestMode]);

  const clearLocalData = useCallback(async () => {
    await clearLocalAuthState();
  }, []);

  const logout = useCallback(async () => {
    await resetBetterAuthClientSession({ refreshSession: betterAuth.refreshSession });
    await clearLocalAuthState();
  }, [betterAuth.refreshSession]);

  return useMemo(
    () => ({
      ...betterAuth,
      status,
      isLoading: status === 'loading',
      isGuest: status === 'guest',
      authActionStatus,
      clientUserId: betterAuth.userId,
      localUser,
      settingsHydrated,
      convexReady: isConvexAuthenticated,
      deletionState,
      deletionLoading,
      signInWithApple,
      signInWithGoogle,
      continueAsGuest,
      logout,
      clearLocalData,
    }),
    [
      betterAuth,
      authActionStatus,
      clearLocalData,
      continueAsGuest,
      deletionState,
      isConvexAuthenticated,
      localUser,
      logout,
      deletionLoading,
      settingsHydrated,
      signInWithApple,
      signInWithGoogle,
      status,
    ]
  );
}

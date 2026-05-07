import { useEffect, useMemo } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useSettingsStore } from '../store';
import { getAuthRedirectTarget } from './authRouteGate';
import { useAuth } from './useAuth';

export function AuthRoutingGate() {
  const router = useRouter();
  const segments = useSegments();
  const auth = useAuth();
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);

  const target = useMemo(
    () =>
      getAuthRedirectTarget({
        status: auth.status,
        authActionStatus: auth.authActionStatus,
        deletionLoading: auth.deletionLoading,
        hasCompletedOnboarding,
        segments: segments as readonly string[],
      }),
    [
      auth.authActionStatus,
      auth.deletionLoading,
      auth.status,
      hasCompletedOnboarding,
      segments,
    ]
  );

  useEffect(() => {
    if (target) {
      router.replace(target as any);
    }
  }, [router, target]);

  return null;
}

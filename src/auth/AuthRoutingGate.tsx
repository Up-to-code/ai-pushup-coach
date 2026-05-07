import { useEffect, useMemo } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useSettingsStore, usePlanStore } from '../store';
import { getAuthRedirectTarget } from './authRouteGate';
import { useAuth } from './useAuth';

export function AuthRoutingGate() {
  const router = useRouter();
  const segments = useSegments();
  const auth = useAuth();
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);
  const hasPlan = usePlanStore((state) => !!state.plan);

  const target = useMemo(
    () =>
      getAuthRedirectTarget({
        status: auth.status,
        authActionStatus: auth.authActionStatus,
        deletionLoading: auth.deletionLoading,
        hasCompletedOnboarding,
        hasPlan,
        segments: segments as readonly string[],
      }),
    [
      auth.authActionStatus,
      auth.deletionLoading,
      auth.status,
      hasCompletedOnboarding,
      hasPlan,
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

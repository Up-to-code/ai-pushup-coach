import { useConvexAuth } from 'convex/react';
import { useBetterAuth, useSettingsHydrated } from '../../auth';
import { useSettingsStore, useUserStore } from '../../store';

export function useIsGuestMode() {
  const { isLoaded, isSignedIn } = useBetterAuth();
  const settingsHydrated = useSettingsHydrated();
  const allowGuestMode = useSettingsStore((state) => state.settings.allowGuestMode);
  return isLoaded && settingsHydrated && !isSignedIn && allowGuestMode;
}

export function useClientUserId() {
  const { userId } = useBetterAuth();
  const localUserId = useUserStore((state) => state.user.id);
  return userId ?? localUserId;
}

export function useAuthenticatedBackendState() {
  const { isLoaded, isSignedIn, userId } = useBetterAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  return {
    canUseAuthenticatedBackend: Boolean(isLoaded && isSignedIn && isAuthenticated && userId),
    authLoading: !isLoaded || isLoading,
    userId,
  };
}

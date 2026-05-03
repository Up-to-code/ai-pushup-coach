import { useConvexAuth } from 'convex/react';
import { useBetterAuth } from '../../auth';
import { useUserStore } from '../../store';
import { useSettingsStore } from '../../store';

export function useIsGuestMode() {
  const { isSignedIn } = useBetterAuth();
  const allowGuestMode = useSettingsStore((state) => state.settings.allowGuestMode);
  return allowGuestMode && !isSignedIn;
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

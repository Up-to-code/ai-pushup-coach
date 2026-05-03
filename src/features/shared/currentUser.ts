import { useAuth } from '@clerk/clerk-expo';
import { useConvexAuth } from 'convex/react';
import { useUserStore } from '../../store';
import { useSettingsStore } from '../../store';

export function useIsGuestMode() {
  const { isSignedIn } = useAuth();
  const allowGuestMode = useSettingsStore((state) => state.settings.allowGuestMode);
  return allowGuestMode && !isSignedIn;
}

export function useClientUserId() {
  const { userId } = useAuth();
  const localUserId = useUserStore((state) => state.user.id);
  return userId ?? localUserId;
}

export function useAuthenticatedBackendState() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  return {
    canUseAuthenticatedBackend: Boolean(isLoaded && isSignedIn && isAuthenticated && userId),
    authLoading: !isLoaded || isLoading,
    userId,
  };
}

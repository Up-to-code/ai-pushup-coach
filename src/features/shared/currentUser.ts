import { useConvexAuth } from 'convex/react';
import { useAuth } from '../../auth';
import { useUserStore } from '../../store';

export function useIsGuestMode() {
  const auth = useAuth();
  return auth.status === 'guest';
}

export function useClientUserId() {
  const { clientUserId } = useAuth();
  const localUserId = useUserStore((state) => state.user.id);
  return clientUserId ?? localUserId;
}

export function useAuthenticatedBackendState() {
  const auth = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  return {
    canUseAuthenticatedBackend: Boolean(auth.status === 'signedIn' && isAuthenticated && auth.clientUserId),
    authLoading: auth.status === 'loading' || isLoading,
    userId: auth.clientUserId,
  };
}

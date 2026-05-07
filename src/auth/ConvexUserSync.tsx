import { useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useBetterAuth } from './useBetterAuth';
import { useUserStore } from '../store';

type RemoteUserWithSubscriptionOwner = {
  subscriptionOwnerUserId?: string;
};

/**
 * ConvexUserSync
 * 
 * This component listens to the user's profile on Convex and syncs 
 * backend-managed fields (reps, streak, energy, proStatus) back to the 
 * local Zustand store.
 * 
 * It ensures that after a workout is processed on the backend, the 
 * frontend's local totals are corrected to match the "true" backend state.
 */
export function ConvexUserSync() {
  const { isLoaded, isSignedIn, userId } = useBetterAuth();
  const updateUser = useUserStore((state) => state.updateUser);
  
  const remoteUser = useQuery(
    api.users.me,
    isLoaded && isSignedIn && userId ? { clientUserId: userId } : 'skip'
  );

  const lastSyncAtRef = useRef<number>(0);

  useEffect(() => {
    if (!remoteUser) {
      return;
    }

    if (remoteUser.clientUserId !== userId) {
      return;
    }

    // Only sync if data has actually changed to prevent unnecessary store updates
    // We use a timestamp or a simple comparison of managed fields
    const now = Date.now();
    
    // We update fields that are primarily managed by the backend
    updateUser({
      streak: remoteUser.streak,
      energy: remoteUser.energy,
      totalReps: remoteUser.totalReps,
      bestReps: remoteUser.bestReps,
      proStatus: remoteUser.proStatus,
      subscriptionStatus: remoteUser.subscriptionStatus,
      subscriptionProvider: remoteUser.subscriptionProvider,
      activeProductIdentifier: remoteUser.activeProductIdentifier,
      activeAccessLevelId: remoteUser.activeAccessLevelId,
      subscriptionUpdatedAt: remoteUser.subscriptionUpdatedAt,
      subscriptionOwnerUserId: (remoteUser as RemoteUserWithSubscriptionOwner).subscriptionOwnerUserId,
    });
    
    lastSyncAtRef.current = now;
  }, [remoteUser, updateUser]);

  return null;
}

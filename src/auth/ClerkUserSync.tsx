import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { useUserStore } from '../store';
import { toLocalUserUpdates } from './clerkUserProfile';

export function ClerkUserSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const updateUser = useUserStore((state) => state.updateUser);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      return;
    }

    updateUser(toLocalUserUpdates(user));
  }, [isLoaded, isSignedIn, updateUser, user]);

  return null;
}

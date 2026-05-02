import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { useUserStore } from '../store';
import { toLocalUserUpdates } from './clerkUserProfile';

export function ClerkUserSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const updateUser = useUserStore((state) => state.updateUser);
  const localAvatar = useUserStore((state) => state.user.avatar);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      return;
    }

    const updates = toLocalUserUpdates(user);
    if (localAvatar) {
      delete updates.avatar;
    }

    updateUser(updates);
  }, [isLoaded, isSignedIn, localAvatar, updateUser, user]);

  return null;
}

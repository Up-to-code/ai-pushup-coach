import { useEffect } from 'react';
import { useUserStore } from '../store';
import { toLocalUserUpdates } from './betterAuthUserProfile';
import { useBetterAuth } from './useBetterAuth';

export function BetterAuthUserSync() {
  const { isLoaded, isSignedIn, user } = useBetterAuth();
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

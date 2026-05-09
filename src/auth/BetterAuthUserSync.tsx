import { useEffect, useMemo, useRef } from 'react';
import { useSaveBackendProfile } from '../backend/useBackendPersistence';
import { useUserStore } from '../store';
import { toLocalUserUpdates } from './betterAuthUserProfile';
import { useBetterAuth } from './useBetterAuth';

export function BetterAuthUserSync() {
  const { isLoaded, isSignedIn, user, userId } = useBetterAuth();
  const updateUser = useUserStore((state) => state.updateUser);
  const localUser = useUserStore((state) => state.user);
  const saveBackendProfile = useSaveBackendProfile();
  const lastProfileSaveSignatureRef = useRef<string | null>(null);
  const localAvatar = localUser.avatar;

  const nextUser = useMemo(() => {
    if (!isLoaded || !isSignedIn || !user || !userId) {
      return null;
    }

    const updates = toLocalUserUpdates(user);
    if (localAvatar) {
      delete updates.avatar;
    }

    return {
      ...localUser,
      ...updates,
      id: userId,
    };
  }, [isLoaded, isSignedIn, localAvatar, localUser, user, userId]);

  useEffect(() => {
    if (!nextUser) {
      return;
    }

    updateUser(nextUser);
  }, [nextUser, updateUser]);

  useEffect(() => {
    if (!nextUser) {
      return;
    }

    const signature = JSON.stringify({
      userId: nextUser.id,
      name: nextUser.name,
      displayName: nextUser.displayName,
      nickname: nextUser.nickname,
      bio: nextUser.bio,
      coachTone: nextUser.coachTone,
      personalityTags: nextUser.personalityTags,
      countryCode: nextUser.countryCode,
      countryName: nextUser.countryName,
      avatar: nextUser.avatar,
      createdAt: nextUser.createdAt,
    });

    if (lastProfileSaveSignatureRef.current === signature) {
      return;
    }

    lastProfileSaveSignatureRef.current = signature;
    void saveBackendProfile(nextUser).catch((error) => {
      lastProfileSaveSignatureRef.current = null;
      console.warn('Convex account profile save failed', error);
    });
  }, [nextUser, saveBackendProfile]);

  return null;
}

import { useEffect, useMemo, useRef } from 'react';
import { useSaveBackendProfile } from '../backend/useBackendPersistence';
import { useUserStore, type User } from '../store';
import { toLocalUserUpdates } from './betterAuthUserProfile';
import { useBetterAuth } from './useBetterAuth';

function toProfileInput(user: User): Parameters<ReturnType<typeof useSaveBackendProfile>>[0] {
  return {
    name: user.name,
    displayName: user.displayName,
    nickname: user.nickname,
    bio: user.bio,
    coachTone: user.coachTone,
    personalityTags: user.personalityTags,
    countryCode: user.countryCode,
    countryName: user.countryName,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

export function BetterAuthUserSync() {
  const { isLoaded, isSignedIn, user, userId } = useBetterAuth();
  const updateUser = useUserStore((state) => state.updateUser);
  const localUser = useUserStore((state) => state.user);
  const saveBackendProfile = useSaveBackendProfile();
  const lastProfileSaveSignatureRef = useRef<string | null>(null);
  const localAvatar = localUser.avatar;

  const authUpdates = useMemo(() => {
    if (!isLoaded || !isSignedIn || !user || !userId) {
      return null;
    }

    const updates = toLocalUserUpdates(user);
    if (localAvatar) {
      delete updates.avatar;
    }

    return {
      ...updates,
      id: userId,
    };
  }, [isLoaded, isSignedIn, localAvatar, user, userId]);

  useEffect(() => {
    if (!authUpdates) {
      return;
    }

    updateUser(authUpdates);
  }, [authUpdates, updateUser]);

  const backendProfile = useMemo(() => {
    if (!authUpdates) {
      return null;
    }

    return toProfileInput({
      ...localUser,
      ...authUpdates,
    });
  }, [authUpdates, localUser]);

  useEffect(() => {
    if (!backendProfile) {
      return;
    }

    const signature = JSON.stringify({ userId, ...backendProfile });

    if (lastProfileSaveSignatureRef.current === signature) {
      return;
    }

    lastProfileSaveSignatureRef.current = signature;
    void saveBackendProfile(backendProfile).catch((error) => {
      lastProfileSaveSignatureRef.current = null;
      console.warn('Convex account profile save failed', error);
    });
  }, [backendProfile, saveBackendProfile, userId]);

  return null;
}

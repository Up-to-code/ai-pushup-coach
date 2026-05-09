import { useCallback } from 'react';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useBetterAuth } from '../auth/useBetterAuth';
import type { Settings, User } from '../store';

type ProfileInput = Pick<
  User,
  | 'name'
  | 'displayName'
  | 'nickname'
  | 'bio'
  | 'coachTone'
  | 'personalityTags'
  | 'countryCode'
  | 'countryName'
  | 'avatar'
  | 'createdAt'
>;

export function useSaveBackendProfile() {
  const { isLoaded, isSignedIn, userId } = useBetterAuth();
  const { isAuthenticated } = useConvexAuth();
  const upsertProfile = useMutation(api.users.upsertProfile);

  return useCallback(
    async (profile: ProfileInput) => {
      if (!isLoaded || !isSignedIn || !isAuthenticated || !userId) {
        return;
      }

      await upsertProfile({
        clientUserId: userId,
        name: profile.name,
        displayName: profile.displayName,
        nickname: profile.nickname,
        bio: profile.bio,
        coachTone: profile.coachTone,
        personalityTags: profile.personalityTags,
        countryCode: profile.countryCode,
        countryName: profile.countryName,
        avatar: profile.avatar,
        createdAt: profile.createdAt,
      });
    },
    [isAuthenticated, isLoaded, isSignedIn, upsertProfile, userId]
  );
}

export function useSaveBackendSettings() {
  const { isLoaded, isSignedIn, userId } = useBetterAuth();
  const { isAuthenticated } = useConvexAuth();
  const upsertSettings = useMutation(api.settings.upsertSettings);

  return useCallback(
    async (settings: Settings) => {
      if (!isLoaded || !isSignedIn || !isAuthenticated || !userId) {
        return;
      }

      await upsertSettings({
        clientUserId: userId,
        soundEnabled: settings.soundEnabled,
        hapticsEnabled: settings.hapticsEnabled,
        theme: settings.theme,
        accentColor: settings.accentColor,
        notificationsEnabled: settings.notificationsEnabled,
        workoutReminderEnabled: settings.workoutReminderEnabled,
        missedReminderEnabled: settings.missedReminderEnabled,
        habitNudgeEnabled: settings.habitNudgeEnabled,
        defaultWorkoutTime: settings.defaultWorkoutTime,
        defaultCameraMode: settings.defaultCameraMode,
      });
    },
    [isAuthenticated, isLoaded, isSignedIn, upsertSettings, userId]
  );
}

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

const lastProfileSaveByUser = new Map<string, string>();
const lastSettingsSaveByUser = new Map<string, string>();

function stableSignature(value: Record<string, unknown>) {
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = value[key];
        return result;
      }, {})
  );
}

export function useSaveBackendProfile() {
  const { isLoaded, isSignedIn, userId } = useBetterAuth();
  const { isAuthenticated } = useConvexAuth();
  const upsertProfile = useMutation(api.users.upsertProfile);

  return useCallback(
    async (profile: ProfileInput) => {
      if (!isLoaded || !isSignedIn || !isAuthenticated || !userId) {
        return;
      }

      const payload = {
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
      };
      const signature = stableSignature(payload);
      if (lastProfileSaveByUser.get(userId) === signature) {
        return;
      }

      lastProfileSaveByUser.set(userId, signature);
      await upsertProfile(payload);
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

      const payload = {
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
      };
      const signature = stableSignature(payload);
      if (lastSettingsSaveByUser.get(userId) === signature) {
        return;
      }

      lastSettingsSaveByUser.set(userId, signature);
      await upsertSettings(payload);
    },
    [isAuthenticated, isLoaded, isSignedIn, upsertSettings, userId]
  );
}

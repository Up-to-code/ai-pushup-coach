import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { customStorage } from './storage';

export interface Settings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  workoutReminderEnabled: boolean;
  missedReminderEnabled: boolean;
  defaultWorkoutTime: string;
  defaultCameraMode: 'faceFocus' | 'fullScene';
  theme: 'dark' | 'mirror';
  accentColor: string;
}

export interface OnboardingProfile {
  goal?: string;
  pains: string[];
  statements: string[];
  preferences: string[];
  demoPlan: string[];
  cameraPrimed: boolean;
  notificationsPrimed: boolean;
}

interface SettingsState {
  settings: Settings;
  hasCompletedOnboarding: boolean;
  onboardingProfile: OnboardingProfile;
  updateSettings: (settings: Partial<Settings>) => void;
  updateOnboardingProfile: (profile: Partial<OnboardingProfile>) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'dark' | 'mirror') => void;
  completeOnboarding: () => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  soundEnabled: true,
  hapticsEnabled: true,
  notificationsEnabled: false,
  workoutReminderEnabled: true,
  missedReminderEnabled: true,
  defaultWorkoutTime: '07:30',
  defaultCameraMode: 'faceFocus',
  theme: 'dark',
  accentColor: '#FF4D6D',
};

const defaultOnboardingProfile: OnboardingProfile = {
  pains: [],
  statements: [],
  preferences: [],
  demoPlan: [],
  cameraPrimed: false,
  notificationsPrimed: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      hasCompletedOnboarding: false,
      onboardingProfile: defaultOnboardingProfile,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      updateOnboardingProfile: (profile) =>
        set((state) => ({
          onboardingProfile: {
            ...state.onboardingProfile,
            ...profile,
            pains: profile.pains ?? state.onboardingProfile.pains,
            statements: profile.statements ?? state.onboardingProfile.statements,
            preferences: profile.preferences ?? state.onboardingProfile.preferences,
            demoPlan: profile.demoPlan ?? state.onboardingProfile.demoPlan,
          },
        })),
      setHapticsEnabled: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, hapticsEnabled: enabled },
        })),
      setSoundEnabled: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, soundEnabled: enabled },
        })),
      setNotificationsEnabled: (enabled) =>
        set((state) => ({
          settings: {
            ...state.settings,
            notificationsEnabled: enabled,
            workoutReminderEnabled: enabled ? state.settings.workoutReminderEnabled : false,
            missedReminderEnabled: enabled ? state.settings.missedReminderEnabled : false,
          },
        })),
      setTheme: (theme) =>
        set((state) => ({
          settings: { ...state.settings, theme },
        })),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'settings-storage',
      storage: customStorage,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsState> | undefined;

        return {
          ...currentState,
          ...persisted,
          settings: {
            ...defaultSettings,
            ...currentState.settings,
            ...persisted?.settings,
          },
          onboardingProfile: {
            ...defaultOnboardingProfile,
            ...currentState.onboardingProfile,
            ...persisted?.onboardingProfile,
            pains: Array.isArray(persisted?.onboardingProfile?.pains)
              ? persisted.onboardingProfile.pains
              : currentState.onboardingProfile.pains,
            statements: Array.isArray(persisted?.onboardingProfile?.statements)
              ? persisted.onboardingProfile.statements
              : currentState.onboardingProfile.statements,
            preferences: Array.isArray(persisted?.onboardingProfile?.preferences)
              ? persisted.onboardingProfile.preferences
              : currentState.onboardingProfile.preferences,
            demoPlan: Array.isArray(persisted?.onboardingProfile?.demoPlan)
              ? persisted.onboardingProfile.demoPlan
              : currentState.onboardingProfile.demoPlan,
          },
          hasCompletedOnboarding:
            typeof persisted?.hasCompletedOnboarding === 'boolean'
              ? persisted.hasCompletedOnboarding
              : currentState.hasCompletedOnboarding,
        };
      },
    }
  )
);

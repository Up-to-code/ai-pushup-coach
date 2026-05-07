import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as SecureStore from 'expo-secure-store';
import { clearLocalAuthState } from './clearLocalAuthState';
import { betterAuthExpoCookieKey, betterAuthExpoSessionDataKey } from './betterAuthExpoStorage';
import { cancelPlanNotifications } from '../services/notifications';
import { usePlanStore, useSettingsStore, useUserStore, useWorkoutStore, type Plan } from '../store';

vi.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map<string, string>();

  return {
    default: {
      getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn(async (key: string) => {
        storage.delete(key);
      }),
    },
  };
});

vi.mock('../services/notifications', () => ({
  cancelPlanNotifications: vi.fn(async () => undefined),
}));

vi.mock('expo-secure-store', () => ({
  deleteItemAsync: vi.fn(async () => undefined),
}));

const testPlan: Plan = {
  id: 'plan-1',
  name: 'Test Plan',
  level: 'beginner',
  goal: 'first_25',
  trainingDays: ['mon', 'wed', 'fri'],
  preferredTime: '07:30',
  notificationIds: ['notification-1', 'notification-2'],
  currentDayIndex: 0,
  duration: '4 weeks',
  totalDays: 1,
  completedDays: 0,
  days: [
    {
      day: 1,
      date: '2026-05-07',
      status: 'current',
      targetReps: 10,
    },
  ],
};

describe('clearLocalAuthState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkoutStore.getState().clearWorkouts();
    usePlanStore.getState().resetPlan();
    useSettingsStore.getState().resetOnboarding();
    useSettingsStore.getState().resetSettings();
    useUserStore.getState().resetUser();
  });

  it('clears local account state and cancels plan notifications', async () => {
    usePlanStore.getState().setPlan(testPlan);
    useSettingsStore.getState().setAllowGuestMode(true);
    useSettingsStore.getState().completeOnboarding();
    useSettingsStore.getState().updateSettings({ notificationsEnabled: true, defaultWorkoutTime: '18:15' });
    useUserStore.getState().updateUser({ id: 'user_123', displayName: 'Signed In User' });
    useWorkoutStore.getState().startWorkout('open');
    useWorkoutStore.getState().addWorkout({
      id: 'workout-1',
      date: '2026-05-07T10:00:00.000Z',
      type: 'open',
      trainingCameraMode: 'faceFocus',
      reps: 20,
      duration: 60,
      calories: 6,
      completed: true,
    });

    await clearLocalAuthState();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(betterAuthExpoCookieKey);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(betterAuthExpoSessionDataKey);
    expect(cancelPlanNotifications).toHaveBeenCalledWith(['notification-1', 'notification-2']);
    expect(useWorkoutStore.getState()).toMatchObject({
      workouts: [],
      currentWorkout: null,
      lastCompletedWorkout: null,
      isActive: false,
      isPaused: false,
    });
    expect(usePlanStore.getState().plan).toBeNull();
    expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(false);
    expect(useSettingsStore.getState().settings.allowGuestMode).toBe(false);
    expect(useSettingsStore.getState().settings.defaultWorkoutTime).toBe('07:30');
    expect(useUserStore.getState().user.id).toBe('local-user');
    expect(useUserStore.getState().user.displayName).toBe('Athlete');
  });
});

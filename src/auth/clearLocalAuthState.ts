import { cancelPlanNotifications } from '../services/notifications';
import { usePlanStore, useSettingsStore, useUserStore, useWorkoutStore } from '../store';
import { clearBetterAuthExpoCache } from './betterAuthExpoStorage';

export async function clearLocalAuthState() {
  const plan = usePlanStore.getState().plan;

  await clearBetterAuthExpoCache();

  if (plan) {
    await cancelPlanNotifications(plan.notificationIds);
  }

  useWorkoutStore.getState().clearWorkouts();
  usePlanStore.getState().resetPlan();
  useSettingsStore.getState().resetOnboarding();
  useSettingsStore.getState().resetSettings();
  useUserStore.getState().resetUser();
}

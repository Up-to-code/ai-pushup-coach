import type { Plan, User } from '../store';
import { getCoachMessage } from '../utils/coachMessages';

type NotificationsModule = typeof import('expo-notifications');

let cachedNotifications: NotificationsModule | null | undefined;

function getNotifications() {
  if (cachedNotifications !== undefined) {
    return cachedNotifications;
  }

  try {
    // The native module only exists after rebuilding the iOS app/dev client.
    // Until then, notification calls should fail soft instead of blocking the app.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedNotifications = require('expo-notifications') as NotificationsModule;
    cachedNotifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (error) {
    cachedNotifications = null;
    console.warn('Notifications are unavailable in this build. Rebuild the native app to enable reminders.', error);
  }

  return cachedNotifications;
}

export async function requestNotificationPermission() {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;

  const next = await Notifications.requestPermissionsAsync();
  return next.status === 'granted';
}

export async function cancelPlanNotifications(notificationIds: string[] = []) {
  const Notifications = getNotifications();
  if (!Notifications) return;

  await Promise.all(
    notificationIds.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined)
    )
  );
}

function secondsUntil(dateString: string) {
  const seconds = Math.round((new Date(dateString).getTime() - Date.now()) / 1000);
  return Math.max(1, seconds);
}

export async function scheduleMissedWorkoutReminder(input: {
  scheduledAt: string;
  title: string;
  body: string;
}) {
  const Notifications = getNotifications();
  if (!Notifications) return null;

  const scheduled = new Date(input.scheduledAt);
  scheduled.setMinutes(scheduled.getMinutes() + 30);

  if (scheduled.getTime() <= Date.now()) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: { kind: 'missedWorkout' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntil(scheduled.toISOString()) },
  });
}

export async function schedulePlanNotifications(input: {
  plan: Plan;
  user: User;
  workoutReminderEnabled: boolean;
  missedReminderEnabled: boolean;
}) {
  const Notifications = getNotifications();
  if (!Notifications) return [];

  const ids: string[] = [];

  for (const day of input.plan.days) {
    if (!day.scheduledAt || day.startedAt || day.status === 'rest' || day.status === 'completed') {
      continue;
    }

    if (new Date(day.scheduledAt).getTime() <= Date.now()) {
      continue;
    }

    if (input.workoutReminderEnabled) {
      const reminderId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Push-up session ready',
          body: getCoachMessage('dueNow', input.user, input.plan),
          data: { kind: 'workoutReminder', planId: input.plan.id, day: day.day },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntil(day.scheduledAt) },
      });
      ids.push(reminderId);
    }

    if (input.missedReminderEnabled) {
      const missedId = await scheduleMissedWorkoutReminder({
        scheduledAt: day.scheduledAt,
        title: 'Still time for today',
        body: getCoachMessage('missed30', input.user, input.plan),
      });
      if (missedId) ids.push(missedId);
    }
  }

  return ids;
}

export async function syncNotificationsForPlan(input: {
  plan: Plan | null;
  user: User;
  notificationsEnabled: boolean;
  workoutReminderEnabled: boolean;
  missedReminderEnabled: boolean;
}) {
  if (!input.plan) return [];

  await cancelPlanNotifications(input.plan.notificationIds);

  if (!input.notificationsEnabled) {
    return [];
  }

  return schedulePlanNotifications({
    plan: input.plan,
    user: input.user,
    workoutReminderEnabled: input.workoutReminderEnabled,
    missedReminderEnabled: input.missedReminderEnabled,
  });
}

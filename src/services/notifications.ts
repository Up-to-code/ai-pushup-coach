import type { Plan, User } from '../store';
import { getCoachMessage } from '../utils/coachMessages';

type NotificationsModule = typeof import('expo-notifications');

let cachedNotifications: NotificationsModule | null | undefined;
const MAX_SCHEDULED_PLAN_NOTIFICATIONS = 48;
const HABIT_NUDGE_DELAY_HOURS = 6;

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

export type PlanNotificationKind = 'workoutReminder' | 'missedWorkout' | 'habitNudge';

export interface PlanNotificationCandidate {
  kind: PlanNotificationKind;
  scheduledAt: string;
  day: number;
}

export function buildPlanNotificationCandidates(input: {
  plan: Plan;
  workoutReminderEnabled: boolean;
  missedReminderEnabled: boolean;
  habitNudgeEnabled: boolean;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const candidates: PlanNotificationCandidate[] = [];

  for (const day of input.plan.days) {
    if (!day.scheduledAt || day.startedAt || day.status === 'rest' || day.status === 'completed') {
      continue;
    }

    const scheduled = new Date(day.scheduledAt);
    if (scheduled.getTime() <= now) {
      continue;
    }

    if (input.workoutReminderEnabled) {
      candidates.push({ kind: 'workoutReminder', scheduledAt: scheduled.toISOString(), day: day.day });
    }

    if (input.missedReminderEnabled) {
      const missedAt = new Date(scheduled);
      missedAt.setMinutes(missedAt.getMinutes() + 30);
      if (missedAt.getTime() > now) {
        candidates.push({ kind: 'missedWorkout', scheduledAt: missedAt.toISOString(), day: day.day });
      }
    }

    if (input.habitNudgeEnabled) {
      const nudgeAt = new Date(scheduled);
      nudgeAt.setHours(nudgeAt.getHours() + HABIT_NUDGE_DELAY_HOURS);
      if (nudgeAt.getTime() > now) {
        candidates.push({ kind: 'habitNudge', scheduledAt: nudgeAt.toISOString(), day: day.day });
      }
    }
  }

  return candidates
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, MAX_SCHEDULED_PLAN_NOTIFICATIONS);
}

export async function schedulePlanNotifications(input: {
  plan: Plan;
  user: User;
  workoutReminderEnabled: boolean;
  missedReminderEnabled: boolean;
  habitNudgeEnabled: boolean;
}) {
  const Notifications = getNotifications();
  if (!Notifications) return [];

  const ids: string[] = [];
  const candidates = buildPlanNotificationCandidates(input);

  for (const candidate of candidates) {
    if (candidate.kind === 'workoutReminder') {
      const reminderId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Push-up session ready',
          body: getCoachMessage('dueNow', input.user, input.plan),
          data: { kind: 'workoutReminder', planId: input.plan.id, day: candidate.day },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntil(candidate.scheduledAt) },
      });
      ids.push(reminderId);
    }

    if (candidate.kind === 'missedWorkout') {
      const missedId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Still time for today',
          body: getCoachMessage('missed30', input.user, input.plan),
          data: { kind: 'missedWorkout', planId: input.plan.id, day: candidate.day },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntil(candidate.scheduledAt) },
      });
      ids.push(missedId);
    }

    if (candidate.kind === 'habitNudge') {
      const nudgeId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'A few reps keep the streak warm',
          body: getCoachMessage('comeback', input.user, input.plan),
          data: { kind: 'habitNudge', planId: input.plan.id, day: candidate.day },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntil(candidate.scheduledAt) },
      });
      ids.push(nudgeId);
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
  habitNudgeEnabled?: boolean;
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
    habitNudgeEnabled: input.habitNudgeEnabled ?? false,
  });
}

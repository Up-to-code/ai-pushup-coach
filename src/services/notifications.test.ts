import { describe, expect, it } from 'vitest';
import { buildPlanNotificationCandidates } from './notifications';
import type { Plan } from '../store';

const now = new Date('2026-05-06T08:00:00.000Z').getTime();

function plan(days: Plan['days']): Plan {
  return {
    id: 'plan-1',
    name: 'Test plan',
    level: 'beginner',
    goal: 'first_25',
    trainingDays: ['mon', 'wed', 'fri'],
    preferredTime: '09:00',
    notificationIds: [],
    currentDayIndex: 0,
    duration: '4 weeks',
    totalDays: days.length,
    completedDays: 0,
    days,
  };
}

describe('buildPlanNotificationCandidates', () => {
  it('schedules workout, missed, and habit nudges only for future training days', () => {
    const candidates = buildPlanNotificationCandidates({
      plan: plan([
        { day: 1, date: '2026-05-06', scheduledAt: '2026-05-06T09:00:00.000Z', status: 'current' },
        { day: 2, date: '2026-05-07', scheduledAt: '2026-05-07T09:00:00.000Z', status: 'rest' },
        { day: 3, date: '2026-05-08', scheduledAt: '2026-05-08T09:00:00.000Z', status: 'completed' },
        { day: 4, date: '2026-05-09', scheduledAt: '2026-05-09T09:00:00.000Z', status: 'locked' },
        { day: 5, date: '2026-05-05', scheduledAt: '2026-05-05T09:00:00.000Z', status: 'locked' },
      ]),
      workoutReminderEnabled: true,
      missedReminderEnabled: true,
      habitNudgeEnabled: true,
      now,
    });

    expect(candidates.map((candidate) => `${candidate.day}:${candidate.kind}`)).toEqual([
      '1:workoutReminder',
      '1:missedWorkout',
      '1:habitNudge',
      '4:workoutReminder',
      '4:missedWorkout',
      '4:habitNudge',
    ]);
  });

  it('caps scheduled candidates to the nearest upcoming notifications', () => {
    const days = Array.from({ length: 30 }, (_, index) => ({
      day: index + 1,
      date: '2026-05-06',
      scheduledAt: new Date(now + (index + 1) * 60 * 60 * 1000).toISOString(),
      status: 'locked' as const,
    }));

    const candidates = buildPlanNotificationCandidates({
      plan: plan(days),
      workoutReminderEnabled: true,
      missedReminderEnabled: true,
      habitNudgeEnabled: true,
      now,
    });

    expect(candidates).toHaveLength(48);
    expect(candidates[0]).toMatchObject({ day: 1, kind: 'workoutReminder' });
    expect(new Date(candidates[0].scheduledAt).getTime()).toBeLessThanOrEqual(
      new Date(candidates[candidates.length - 1].scheduledAt).getTime()
    );
  });
});

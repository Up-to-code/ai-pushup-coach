import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateTrainingPlan, getCurrentPlanDay } from './planGenerator';

describe('generateTrainingPlan', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a current workout day with set targets and rest timing', () => {
    vi.setSystemTime(new Date('2026-05-04T10:00:00.000Z'));

    const plan = generateTrainingPlan({
      level: 'beginner',
      goal: 'road_50',
      trainingDays: ['mon', 'wed', 'fri'],
      preferredTime: '07:30',
    });
    const currentDay = getCurrentPlanDay(plan);

    expect(plan.days).toHaveLength(28);
    expect(currentDay?.status).toBe('current');
    expect(currentDay?.sets?.length).toBeGreaterThanOrEqual(3);
    expect(currentDay?.restTime).toBe(60);
    const scheduledAt = new Date(currentDay?.scheduledAt ?? '');
    expect(scheduledAt.getHours()).toBe(7);
    expect(scheduledAt.getMinutes()).toBe(30);
  });

  it('skips rest days when selecting the first current day', () => {
    vi.setSystemTime(new Date('2026-05-04T10:00:00.000Z'));

    const plan = generateTrainingPlan({
      level: 'intermediate',
      goal: 'road_100',
      trainingDays: ['tue'],
      preferredTime: '18:15',
    });
    const currentDay = getCurrentPlanDay(plan);

    expect(plan.days[0].status).toBe('rest');
    expect(currentDay?.date).toBe('2026-05-05');
    const scheduledAt = new Date(currentDay?.scheduledAt ?? '');
    expect(scheduledAt.getHours()).toBe(18);
    expect(scheduledAt.getMinutes()).toBe(15);
  });

  it('keeps generated set totals aligned to the day target', () => {
    vi.setSystemTime(new Date('2026-05-04T10:00:00.000Z'));

    const plan = generateTrainingPlan({
      level: 'advanced',
      goal: 'road_100',
      trainingDays: ['mon', 'wed', 'fri', 'sat'],
      preferredTime: '06:00',
    });

    for (const day of plan.days.filter((entry) => entry.status !== 'rest')) {
      expect(day.sets?.reduce((sum, value) => sum + value, 0)).toBe(day.targetReps);
      expect(day.targetReps).toBeLessThanOrEqual(100);
    }
  });
});

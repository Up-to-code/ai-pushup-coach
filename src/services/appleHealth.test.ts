import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import { buildAppleHealthWorkoutPayload, shouldExportWorkoutToAppleHealth } from './appleHealth';
import type { Workout } from '../store';

function workout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'workout-1',
    date: '2026-05-21T10:00:30.000Z',
    type: 'sets',
    trainingCameraMode: 'faceFocus',
    reps: 12,
    duration: 30,
    calories: 4,
    completed: true,
    startTime: Date.parse('2026-05-21T10:00:00.000Z'),
    ...overrides,
  };
}

describe('Apple Health workout export', () => {
  it('exports completed workouts with reps', () => {
    expect(shouldExportWorkoutToAppleHealth(workout())).toBe(true);
  });

  it('does not export zero-rep workouts', () => {
    expect(shouldExportWorkoutToAppleHealth(workout({ reps: 0 }))).toBe(false);
  });

  it('does not export incomplete workouts', () => {
    expect(shouldExportWorkoutToAppleHealth(workout({ completed: false }))).toBe(false);
  });

  it('does not export a workout twice', () => {
    expect(shouldExportWorkoutToAppleHealth(workout({ appleHealthSyncedAt: Date.now() }))).toBe(false);
  });

  it('maps local workouts to HealthKit strength workouts', () => {
    expect(buildAppleHealthWorkoutPayload(workout())).toEqual({
      type: 'FunctionalStrengthTraining',
      startDate: '2026-05-21T10:00:00.000Z',
      endDate: '2026-05-21T10:00:30.000Z',
      duration: 30,
      energyBurned: 4,
      energyBurnedUnit: 'calorie',
    });
  });
});

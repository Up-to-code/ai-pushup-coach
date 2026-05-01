import { describe, expect, it } from 'vitest';
import { buildDailySeries, computeWorkoutStats, dayKey, filterWorkoutsByPeriod, getRangeForPeriod, type ProfileWorkoutRow } from './analytics';

function workout(id: string, date: string, reps: number, completed = true): ProfileWorkoutRow {
  return {
    id,
    clientWorkoutId: id,
    date: new Date(date).getTime(),
    type: 'open',
    trainingCameraMode: 'faceFocus',
    reps,
    duration: reps * 3,
    calories: reps,
    completed,
  };
}

describe('profile analytics helpers', () => {
  const now = new Date('2026-05-01T12:00:00.000Z');

  it('filters the current Monday-start week only', () => {
    const rows = [
      workout('today', '2026-05-01T08:00:00.000Z', 10),
      workout('monday', '2026-04-27T08:00:00.000Z', 7),
      workout('sunday-before', '2026-04-26T08:00:00.000Z', 99),
    ];

    expect(filterWorkoutsByPeriod(rows, 'W', 0, now).map((row) => row.id)).toEqual(['today', 'monday']);
  });

  it('uses Monday and Sunday as weekly range boundaries', () => {
    const range = getRangeForPeriod('W', 0, now);

    expect(dayKey(range.start)).toBe('2026-04-27');
    expect(dayKey(range.end)).toBe('2026-05-03');
  });

  it('uses zero buckets for empty days in weekly chart data', () => {
    const series = buildDailySeries([workout('today', '2026-05-01T08:00:00.000Z', 10)], 'W', 0, now);

    expect(series).toHaveLength(7);
    expect(series[0]).toMatchObject({ key: '2026-04-27', reps: 0, workouts: 0 });
    expect(series[4]).toMatchObject({ key: '2026-05-01', reps: 10, workouts: 1 });
    expect(series[6]).toMatchObject({ key: '2026-05-03', reps: 0, workouts: 0 });
  });

  it('aggregates multiple completed sessions on the same day', () => {
    const series = buildDailySeries([
      workout('morning', '2026-04-30T08:00:00.000Z', 12),
      workout('evening', '2026-04-30T18:00:00.000Z', 8),
    ], 'W', 0, now);

    expect(series.find((point) => point.key === '2026-04-30')).toMatchObject({ reps: 20, workouts: 2 });
  });

  it('excludes incomplete workouts from stats and chart buckets', () => {
    const rows = [
      workout('complete', '2026-05-01T08:00:00.000Z', 10, true),
      workout('incomplete', '2026-05-01T09:00:00.000Z', 50, false),
    ];

    expect(computeWorkoutStats(rows)).toMatchObject({ totalReps: 10, sessions: 1, bestSession: 10 });
    expect(buildDailySeries(rows, 'W', 0, now).find((point) => point.key === '2026-05-01')).toMatchObject({
      reps: 10,
      workouts: 1,
    });
  });

  it('groups all-time chart data by month', () => {
    const series = buildDailySeries([
      workout('jan-a', '2026-01-05T08:00:00.000Z', 10),
      workout('jan-b', '2026-01-07T08:00:00.000Z', 15),
      workout('feb', '2026-02-01T08:00:00.000Z', 3),
    ], 'ALL', 0, now);

    expect(series.map((point) => ({ key: point.key, reps: point.reps, workouts: point.workouts }))).toEqual([
      { key: '2026-01', reps: 25, workouts: 2 },
      { key: '2026-02', reps: 3, workouts: 1 },
    ]);
  });
});

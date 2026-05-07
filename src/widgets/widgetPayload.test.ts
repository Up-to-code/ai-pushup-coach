import { describe, expect, it } from 'vitest';
import { buildWidgetPayload, getWidgetPayloadSignature } from './widgetPayload';
import type { User, Workout } from '../store';

const user: Pick<User, 'streak' | 'displayName' | 'name'> = {
  streak: 4,
  displayName: 'Ahmed',
  name: 'Athlete',
};

function workout(id: string, date: string, reps: number, completed = true): Workout {
  return {
    id,
    date,
    type: 'open',
    trainingCameraMode: 'faceFocus',
    reps,
    duration: reps * 3,
    calories: reps,
    completed,
  };
}

describe('buildWidgetPayload', () => {
  it('uses completed local workouts as the source of truth for total and best reps', () => {
    const payload = buildWidgetPayload({
      user,
      now: new Date('2026-05-02T12:00:00Z'),
      workouts: [
        workout('monday', '2026-04-27T10:00:00Z', 12),
        workout('draft', '2026-04-28T10:00:00Z', 99, false),
        workout('friday', '2026-05-01T10:00:00Z', 22),
      ],
    });

    expect(payload.totalReps).toBe(34);
    expect(payload.bestReps).toBe(22);
    expect(payload.lastWorkoutReps).toBe(22);
    expect(payload.lastWorkoutDate).toBe('2026-05-01T10:00:00Z');
  });

  it('builds a Monday-start weekly chart from completed workouts only', () => {
    const payload = buildWidgetPayload({
      user,
      now: new Date('2026-05-02T12:00:00Z'),
      workouts: [
        workout('before-week', '2026-04-26T10:00:00Z', 50),
        workout('monday-a', '2026-04-27T10:00:00Z', 8),
        workout('monday-b', '2026-04-27T12:00:00Z', 2),
        workout('thursday-draft', '2026-04-30T10:00:00Z', 40, false),
        workout('saturday', '2026-05-02T10:00:00Z', 15),
      ],
    });

    expect(payload.weeklyReps.map((point) => point.label)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(payload.weeklyReps.map((point) => point.reps)).toEqual([10, 0, 0, 0, 0, 15, 0]);
  });

  it('falls back to the local weekly score for friends when server comparison is unavailable', () => {
    const payload = buildWidgetPayload({
      user,
      now: new Date('2026-05-02T12:00:00Z'),
      workouts: [workout('saturday', '2026-05-02T10:00:00Z', 15)],
    });

    expect(payload.friendsThisWeek).toMatchObject({
      rank: 0,
      score: 15,
      friendAverage: 0,
      deltaToNext: 0,
      friendsCount: 0,
    });
  });

  it('sanitizes invalid user and friend numbers before sending data to WidgetKit', () => {
    const payload = buildWidgetPayload({
      user: {
        streak: Number.NaN,
        displayName: '  Very Long Athlete Name That Should Not Blow Up The Widget  ',
        name: 'Athlete',
        totalReps: Infinity,
        bestReps: -10,
      },
      now: new Date('2026-05-02T12:00:00Z'),
      workouts: [],
      friendComparison: {
        rank: Number.NaN,
        score: Infinity,
        friendAverage: -3,
        deltaToNext: Number.NaN,
        friendsCount: Infinity,
      },
    });

    expect(payload).toMatchObject({
      streak: 0,
      totalReps: 0,
      bestReps: 0,
      friendsThisWeek: {
        rank: 0,
        score: 0,
        friendAverage: 0,
        deltaToNext: 0,
        friendsCount: 0,
      },
    });
    expect(payload.displayName).toBe('Very Long Athlete Name T');
    expect(JSON.stringify(payload)).not.toMatch(/NaN|Infinity/);
  });

  it('keeps the widget useful with local stats when no friend comparison is available', () => {
    const payload = buildWidgetPayload({
      user,
      now: new Date('2026-05-02T12:00:00Z'),
      workouts: [workout('saturday', '2026-05-02T10:00:00Z', 18)],
      friendComparison: undefined,
    });

    expect(payload.displayName).toBe('Ahmed');
    expect(payload.totalReps).toBe(18);
    expect(payload.friendsThisWeek.score).toBe(18);
  });

  it('ignores updatedAt when detecting duplicate payloads', () => {
    const first = buildWidgetPayload({
      user,
      now: new Date('2026-05-02T12:00:00Z'),
      workouts: [workout('saturday', '2026-05-02T10:00:00Z', 15)],
    });
    const second = buildWidgetPayload({
      user,
      now: new Date('2026-05-02T12:01:00Z'),
      workouts: [workout('saturday', '2026-05-02T10:00:00Z', 15)],
    });

    expect(first.updatedAt).not.toBe(second.updatedAt);
    expect(getWidgetPayloadSignature(first)).toBe(getWidgetPayloadSignature(second));
  });
});

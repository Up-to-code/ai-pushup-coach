import { describe, expect, it } from 'vitest';
import { scoreLeaderboardWorkouts, type LeaderboardScoreWorkout } from './scoring';

function workout(date: string, reps: number, completed = true): LeaderboardScoreWorkout {
  return {
    date: new Date(date).getTime(),
    reps,
    completed,
  };
}

describe('leaderboard period scoring', () => {
  const now = new Date('2026-05-01T12:00:00.000Z');

  it('scores this week from Monday through Sunday', () => {
    const workouts = [
      workout('2026-04-26T08:00:00.000Z', 99),
      workout('2026-04-27T08:00:00.000Z', 10),
      workout('2026-05-01T08:00:00.000Z', 15),
      workout('2026-05-03T08:00:00.000Z', 20),
      workout('2026-05-04T08:00:00.000Z', 100),
    ];

    expect(scoreLeaderboardWorkouts(workouts, 'W', 500, now)).toBe(45);
  });

  it('uses all-time total reps for the all-time ranking', () => {
    const workouts = [
      workout('2026-04-27T08:00:00.000Z', 10),
      workout('2026-05-01T08:00:00.000Z', 15, false),
    ];

    expect(scoreLeaderboardWorkouts(workouts, 'ALL', 500, now)).toBe(500);
  });
});

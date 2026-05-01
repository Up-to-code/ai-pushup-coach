import { getRangeForPeriod, type TimePeriod } from '../profile/analytics';

export interface LeaderboardScoreWorkout {
  date: number;
  reps: number;
  completed: boolean;
}

export function scoreLeaderboardWorkouts(
  workouts: LeaderboardScoreWorkout[],
  period: TimePeriod,
  totalReps: number,
  now = new Date()
) {
  if (period === 'ALL') {
    return totalReps;
  }

  const range = getRangeForPeriod(period, 0, now);
  return workouts
    .filter((workout) => workout.completed && workout.date >= range.start && workout.date <= range.end)
    .reduce((sum, workout) => sum + workout.reps, 0);
}

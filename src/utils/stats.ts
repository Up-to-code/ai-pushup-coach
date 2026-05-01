import type { Workout } from '../store';

export interface MonthlyStat {
  month: string;
  pushups: number;
  workouts: number;
}

export function calculateTotalStats(workouts: Workout[]) {
  const completed = workouts.filter((workout) => workout.completed);

  return {
    totalPushups: completed.reduce((sum, workout) => sum + workout.reps, 0),
    totalDuration: completed.reduce((sum, workout) => sum + workout.duration, 0),
    totalCalories: completed.reduce((sum, workout) => sum + workout.calories, 0),
    practiceDays: completed.length,
    avgReps:
      completed.length > 0
        ? Math.round(completed.reduce((sum, workout) => sum + workout.reps, 0) / completed.length)
        : 0,
  };
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

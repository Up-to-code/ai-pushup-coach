import type { Workout } from '../../store';

export type TimePeriod = 'W' | 'M' | 'Y' | 'ALL';

export interface WorkoutStats {
  totalReps: number;
  totalDuration: number;
  totalCalories: number;
  bestSession: number;
  avgSpeed: string;
  sessions: number;
}

export interface DailySeriesPoint {
  key: string;
  label: string;
  reps: number;
  workouts: number;
}

export interface ProfileWorkoutRow {
  id: string;
  clientWorkoutId: string;
  date: number;
  type: Workout['type'];
  trainingCameraMode: Workout['trainingCameraMode'];
  reps: number;
  duration: number;
  calories: number;
  completed: boolean;
  formFeedbackState?: Workout['formFeedbackState'];
  cameraPresentationState?: Workout['cameraPresentationState'];
  qualityScore?: number;
}

export function getDaysForPeriod(period: TimePeriod) {
  if (period === 'W') return 7;
  if (period === 'M') return 30;
  if (period === 'Y') return 365;
  return 99999;
}

export function getMondayWeekStart(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export function getRangeForPeriod(period: TimePeriod, offset = 0, now = new Date()) {
  if (period === 'ALL') {
    return { start: 0, end: now.getTime(), days: 99999 };
  }

  const days = getDaysForPeriod(period);
  if (period === 'W') {
    const base = new Date(now);
    base.setDate(base.getDate() - offset * days);
    const start = getMondayWeekStart(base);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime(), days };
  }

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() - offset * days);

  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  return { start: start.getTime(), end: end.getTime(), days };
}

export function dayKey(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function monthKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 7);
}

export function formatSeriesLabel(key: string, period: TimePeriod) {
  if (period === 'ALL') {
    const [year, month] = key.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }

  return new Date(`${key}T12:00:00`).toLocaleDateString('en-US', {
    month: period === 'Y' ? 'short' : undefined,
    day: period === 'Y' ? undefined : 'numeric',
  });
}

export function computeWorkoutStats(sessions: Array<Pick<ProfileWorkoutRow, 'completed' | 'reps' | 'duration' | 'calories'>>): WorkoutStats {
  const completed = sessions.filter((workout) => workout.completed);
  const totalReps = completed.reduce((sum, workout) => sum + workout.reps, 0);
  const totalDuration = completed.reduce((sum, workout) => sum + workout.duration, 0);
  const totalCalories = completed.reduce((sum, workout) => sum + workout.calories, 0);
  const bestSession = completed.length > 0 ? Math.max(...completed.map((workout) => workout.reps)) : 0;
  const avgSpeed = totalDuration > 0 ? ((totalReps / totalDuration) * 60).toFixed(1) : '0';

  return {
    totalReps,
    totalDuration,
    totalCalories,
    bestSession,
    avgSpeed,
    sessions: completed.length,
  };
}

export function buildDailySeries(
  workouts: Array<Pick<ProfileWorkoutRow, 'date' | 'reps' | 'completed'>>,
  period: TimePeriod,
  offset = 0,
  now = new Date()
): DailySeriesPoint[] {
  const completed = workouts.filter((workout) => workout.completed);

  if (period === 'ALL') {
    const buckets = new Map<string, DailySeriesPoint>();
    completed.forEach((workout) => {
      const key = monthKey(workout.date);
      const current = buckets.get(key) ?? {
        key,
        label: formatSeriesLabel(key, period),
        reps: 0,
        workouts: 0,
      };
      current.reps += workout.reps;
      current.workouts += 1;
      buckets.set(key, current);
    });
    return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  const range = getRangeForPeriod(period, offset, now);
  const buckets = new Map<string, DailySeriesPoint>();
  for (let index = 0; index < range.days; index += 1) {
    const date = new Date(range.start);
    date.setDate(date.getDate() + index);
    const key = dayKey(date.getTime());
    buckets.set(key, {
      key,
      label: formatSeriesLabel(key, period),
      reps: 0,
      workouts: 0,
    });
  }

  completed.forEach((workout) => {
    if (workout.date < range.start || workout.date > range.end) return;
    const key = dayKey(workout.date);
    const current = buckets.get(key);
    if (!current) return;
    current.reps += workout.reps;
    current.workouts += 1;
  });

  return [...buckets.values()];
}

export function filterWorkoutsByPeriod(
  source: Array<ProfileWorkoutRow>,
  period: TimePeriod,
  offset = 0,
  now = new Date()
) {
  if (period === 'ALL') {
    return source.filter((workout) => workout.completed);
  }
  const range = getRangeForPeriod(period, offset, now);
  return source.filter((workout) => workout.completed && workout.date >= range.start && workout.date <= range.end);
}

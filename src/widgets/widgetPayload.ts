import { buildDailySeries } from '../features/profile/analytics';
import type { User, Workout } from '../store';

export type WeeklyRepPoint = {
  label: string;
  reps: number;
};

export type FriendWidgetSummary = {
  rank: number;
  score: number;
  friendAverage: number;
  deltaToNext: number;
  friendsCount: number;
};

export type WidgetPayload = {
  streak: number;
  totalReps: number;
  bestReps: number;
  lastWorkoutReps: number;
  lastWorkoutDate: string;
  displayName: string;
  weeklyReps: WeeklyRepPoint[];
  friendsThisWeek: FriendWidgetSummary;
  updatedAt: string;
};

export type FriendComparisonInput = Partial<FriendWidgetSummary> | null | undefined;

export function buildWidgetPayload(
  input: {
    user: Pick<User, 'streak' | 'displayName' | 'name'> & Partial<Pick<User, 'totalReps' | 'bestReps'>>;
    workouts: Workout[];
    friendComparison?: FriendComparisonInput;
    now?: Date;
  }
): WidgetPayload {
  const now = input.now ?? new Date();
  const weeklyReps = buildWeeklyReps(input.workouts, now);
  const localWeekScore = weeklyReps.reduce((sum, point) => sum + point.reps, 0);
  const completedWorkouts = input.workouts.filter((workout) => workout.completed);
  const localTotalReps = completedWorkouts.reduce((sum, workout) => sum + safeReps(workout.reps), 0);
  const localBestReps = completedWorkouts.reduce((best, workout) => Math.max(best, safeReps(workout.reps)), 0);
  const lastCompletedWorkout = getLastCompletedWorkout(completedWorkouts);
  const displayName = safeDisplayName(input.user.displayName || input.user.name);

  return {
    streak: safeWholeNumber(input.user.streak),
    totalReps: completedWorkouts.length > 0 ? localTotalReps : safeWholeNumber(input.user.totalReps),
    bestReps: completedWorkouts.length > 0 ? localBestReps : safeWholeNumber(input.user.bestReps),
    lastWorkoutReps: lastCompletedWorkout ? safeReps(lastCompletedWorkout.reps) : 0,
    lastWorkoutDate: lastCompletedWorkout?.date ?? '',
    displayName,
    weeklyReps,
    friendsThisWeek: {
      rank: safeWholeNumber(input.friendComparison?.rank),
      score: input.friendComparison?.score === undefined ? localWeekScore : safeWholeNumber(input.friendComparison.score),
      friendAverage: safeWholeNumber(input.friendComparison?.friendAverage),
      deltaToNext: safeWholeNumber(input.friendComparison?.deltaToNext),
      friendsCount: safeWholeNumber(input.friendComparison?.friendsCount),
    },
    updatedAt: now.toISOString(),
  };
}

export function buildLockedWidgetPayload(
  input: {
    user: Pick<User, 'displayName' | 'name'>;
    now?: Date;
  }
): WidgetPayload {
  const now = input.now ?? new Date();

  return {
    streak: 0,
    totalReps: 0,
    bestReps: 0,
    lastWorkoutReps: 0,
    lastWorkoutDate: '',
    displayName: 'Upgrade to Pro',
    weeklyReps: ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label) => ({ label, reps: 0 })),
    friendsThisWeek: {
      rank: 0,
      score: 0,
      friendAverage: 0,
      deltaToNext: 0,
      friendsCount: 0,
    },
    updatedAt: now.toISOString(),
  };
}

export function getWidgetPayloadSignature(payload: WidgetPayload) {
  return JSON.stringify({
    ...payload,
    updatedAt: undefined,
  });
}

function buildWeeklyReps(workouts: Workout[], now: Date): WeeklyRepPoint[] {
  return buildDailySeries(
    workouts.map((workout) => ({
      date: Date.parse(workout.date) || 0,
      reps: safeReps(workout.reps),
      completed: workout.completed,
    })),
    'W',
    0,
    now
  ).map((point) => ({
    label: new Date(`${point.key}T12:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' }),
    reps: point.reps,
  }));
}

function getLastCompletedWorkout(workouts: Workout[]) {
  return workouts.reduce<Workout | null>((latest, workout) => {
    if (!latest) {
      return workout;
    }

    const latestTime = Date.parse(latest.date) || 0;
    const workoutTime = Date.parse(workout.date) || 0;
    return workoutTime >= latestTime ? workout : latest;
  }, null);
}

function safeReps(reps: number) {
  return Number.isFinite(reps) && reps > 0 ? reps : 0;
}

function safeWholeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function safeDisplayName(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return 'Athlete';
  return trimmed.slice(0, 24);
}

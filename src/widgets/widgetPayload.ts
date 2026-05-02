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
    user: Pick<User, 'streak' | 'displayName' | 'name' | 'totalReps' | 'bestReps'>;
    workouts: Workout[];
    friendComparison?: FriendComparisonInput;
    now?: Date;
  }
): WidgetPayload {
  const now = input.now ?? new Date();
  const weeklyReps = buildWeeklyReps(input.workouts, now);
  const localWeekScore = weeklyReps.reduce((sum, point) => sum + point.reps, 0);
  const completedWorkouts = input.workouts.filter((workout) => workout.completed);
  const lastCompletedWorkout = getLastCompletedWorkout(completedWorkouts);

  return {
    streak: input.user.streak ?? 0,
    totalReps: input.user.totalReps ?? 0,
    bestReps: input.user.bestReps ?? 0,
    lastWorkoutReps: lastCompletedWorkout ? safeReps(lastCompletedWorkout.reps) : 0,
    lastWorkoutDate: lastCompletedWorkout?.date ?? '',
    displayName: input.user.displayName || input.user.name || 'Athlete',
    weeklyReps,
    friendsThisWeek: {
      rank: input.friendComparison?.rank ?? 0,
      score: input.friendComparison?.score ?? localWeekScore,
      friendAverage: input.friendComparison?.friendAverage ?? 0,
      deltaToNext: input.friendComparison?.deltaToNext ?? 0,
      friendsCount: input.friendComparison?.friendsCount ?? 0,
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

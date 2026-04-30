import type { Day, Plan, PlanGoal, PlanLevel } from '../store';

const GOAL_LABELS: Record<PlanGoal, string> = {
  first_25: 'First 25 Clean Pushups',
  road_50: 'Road to 50 Pushups',
  road_100: 'Road to 100 Pushups',
};

const GOAL_TARGETS: Record<PlanGoal, number> = {
  first_25: 25,
  road_50: 50,
  road_100: 100,
};

const LEVEL_START: Record<PlanLevel, number> = {
  beginner: 6,
  intermediate: 14,
  advanced: 26,
};

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function scheduleDate(date: Date, preferredTime: string) {
  const [hours, minutes] = preferredTime.split(':').map(Number);
  const scheduled = new Date(date);
  scheduled.setHours(hours || 7, minutes || 30, 0, 0);
  return scheduled.toISOString();
}

function weekdayId(date: Date) {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
}

function buildSets(target: number, workoutNumber: number) {
  const setCount = workoutNumber < 5 ? 3 : workoutNumber < 12 ? 4 : 5;
  const weights = setCount === 3 ? [0.38, 0.34, 0.28] : setCount === 4 ? [0.3, 0.27, 0.23, 0.2] : [0.24, 0.22, 0.2, 0.18, 0.16];
  let remaining = target;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) {
      return Math.max(1, remaining);
    }
    const reps = Math.max(1, Math.round(target * weight));
    remaining -= reps;
    return reps;
  });
}

export function generateTrainingPlan(input: {
  level: PlanLevel;
  goal: PlanGoal;
  trainingDays: string[];
  preferredTime: string;
}): Plan {
  const today = new Date();
  const totalDays = 28;
  const workoutDates: number[] = [];
  const days: Day[] = [];
  const selectedDays = input.trainingDays.length ? input.trainingDays : ['mon', 'wed', 'fri'];
  const startTarget = LEVEL_START[input.level];
  const finalTarget = GOAL_TARGETS[input.goal];

  for (let index = 0; index < totalDays; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    if (selectedDays.includes(weekdayId(date))) {
      workoutDates.push(index);
    }
  }

  for (let index = 0; index < totalDays; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const workoutNumber = workoutDates.indexOf(index);
    const isWorkout = workoutNumber >= 0;
    const progress = workoutDates.length <= 1 ? 1 : workoutNumber / Math.max(1, workoutDates.length - 1);
    const targetReps = isWorkout
      ? Math.round(startTarget + (finalTarget - startTarget) * Math.max(0, progress))
      : undefined;

    days.push({
      day: index + 1,
      date: dayKey(date),
      scheduledAt: isWorkout ? scheduleDate(date, input.preferredTime) : undefined,
      status: isWorkout ? 'locked' : 'rest',
      sets: targetReps ? buildSets(targetReps, workoutNumber) : undefined,
      targetReps,
      restTime: targetReps && targetReps > 35 ? 90 : 60,
    });
  }

  const firstWorkoutIndex = days.findIndex((day) => day.status !== 'rest');
  if (firstWorkoutIndex >= 0) {
    days[firstWorkoutIndex] = { ...days[firstWorkoutIndex], status: 'current' };
  }

  return {
    id: `plan-${Date.now()}`,
    name: GOAL_LABELS[input.goal],
    level: input.level,
    goal: input.goal,
    trainingDays: selectedDays,
    preferredTime: input.preferredTime,
    notificationIds: [],
    currentDayIndex: Math.max(0, firstWorkoutIndex),
    duration: '4 Weeks',
    totalDays,
    completedDays: 0,
    days,
  };
}

export function getCurrentPlanDay(plan: Plan | null) {
  if (!plan) return null;
  return plan.days[plan.currentDayIndex] ?? plan.days.find((day) => day.status === 'current') ?? null;
}

export function formatPreferredTime(time: string) {
  const [rawHours, rawMinutes] = time.split(':').map(Number);
  const hours = rawHours || 0;
  const minutes = rawMinutes || 0;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${suffix}`;
}

import { Workout } from '../store';

const feedbackStates: Array<NonNullable<Workout['formFeedbackState']>> = [
  'good',
  'good',
  'tooFast',
  'badForm',
];

const generateMockWorkouts = (): Workout[] => {
  const workouts: Workout[] = [];
  const today = new Date();

  for (let i = 0; i < 18; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const types: Workout['type'][] = ['open', 'timer', 'limit', 'sets'];
    const type = types[i % 4];
    const reps = 24 + ((i * 7) % 40);
    const duration = type === 'timer' ? 90 : 360 + i * 14;

    workouts.push({
      id: `workout-${i}`,
      date: date.toISOString(),
      type,
      trainingCameraMode: i % 2 === 0 ? 'faceFocus' : 'fullScene',
      reps,
      duration,
      calories: Math.round(reps * 0.29),
      completed: true,
      formFeedbackState: feedbackStates[i % feedbackStates.length],
      cameraPresentationState: 'tracking',
      qualityScore: 76 + (i % 5) * 4,
    });
  }

  return workouts;
};

export const mockWorkouts = generateMockWorkouts();

export const calculateTotalStats = (workouts: Workout[]) => {
  const completed = workouts.filter((w) => w.completed);

  return {
    totalPushups: completed.reduce((sum, w) => sum + w.reps, 0),
    totalDuration: completed.reduce((sum, w) => sum + w.duration, 0),
    totalCalories: completed.reduce((sum, w) => sum + w.calories, 0),
    practiceDays: completed.length,
    avgReps:
      completed.length > 0
        ? Math.round(completed.reduce((sum, w) => sum + w.reps, 0) / completed.length)
        : 0,
  };
};

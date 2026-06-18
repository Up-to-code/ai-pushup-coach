import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkoutStore } from './useWorkoutStore';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}));

function resetWorkoutStore() {
  useWorkoutStore.setState({
    workouts: [],
    currentWorkout: null,
    lastCompletedWorkout: null,
    isActive: false,
    isPaused: false,
  });
}

describe('useWorkoutStore finish flow', () => {
  beforeEach(() => {
    resetWorkoutStore();
  });

  it('finalizes the active workout before navigation can clear session state', () => {
    const store = useWorkoutStore.getState();
    store.startWorkout('sets', 'faceFocus', 12, [3, 4, 5], 45);

    useWorkoutStore.getState().incrementReps();
    useWorkoutStore.getState().incrementReps();
    useWorkoutStore.getState().incrementReps();
    useWorkoutStore.getState().pauseWorkout();

    const completed = useWorkoutStore.getState().finishWorkout(true, {
      duration: 37,
      formFeedbackState: 'good',
      cameraPresentationState: 'tracking',
    });
    const nextState = useWorkoutStore.getState();

    expect(completed).toMatchObject({
      reps: 3,
      duration: 37,
      calories: 1,
      completed: true,
      type: 'sets',
      sets: [3, 4, 5],
      restTime: 45,
      formFeedbackState: 'good',
      cameraPresentationState: 'tracking',
    });
    expect(nextState.currentWorkout).toBeNull();
    expect(nextState.isActive).toBe(false);
    expect(nextState.isPaused).toBe(false);
    expect(nextState.workouts).toHaveLength(1);
    expect(nextState.workouts[0].id).toBe(completed?.id);
    expect(nextState.lastCompletedWorkout?.id).toBe(completed?.id);
    expect(nextState.lastCompletedWorkout?.reps).toBe(3);
  });

  it('marks a completed workout as exported to Apple Health', () => {
    useWorkoutStore.getState().startWorkout('open', 'faceFocus', 10);
    useWorkoutStore.getState().incrementReps();
    const finished = useWorkoutStore.getState().finishWorkout(true, { duration: 12 });

    useWorkoutStore.getState().markWorkoutAppleHealthSynced(finished?.id ?? '', 1234);

    expect(useWorkoutStore.getState().workouts[0].appleHealthSyncedAt).toBe(1234);
    expect(useWorkoutStore.getState().lastCompletedWorkout?.appleHealthSyncedAt).toBe(1234);
  });

  it('does not create a duplicate workout if finish is called again after session close', () => {
    useWorkoutStore.getState().startWorkout('open', 'faceFocus', 10);
    useWorkoutStore.getState().incrementReps();

    const firstFinish = useWorkoutStore.getState().finishWorkout(true, { duration: 12 });
    const secondFinish = useWorkoutStore.getState().finishWorkout(true, { duration: 99 });

    expect(firstFinish?.reps).toBe(1);
    expect(secondFinish).toBeNull();
    expect(useWorkoutStore.getState().workouts).toHaveLength(1);
    expect(useWorkoutStore.getState().workouts[0].duration).toBe(12);
    expect(useWorkoutStore.getState().lastCompletedWorkout?.duration).toBe(12);
  });

  it('can save an incomplete zero-rep attempt without advancing it as completed', () => {
    useWorkoutStore.getState().startWorkout('open', 'faceFocus', 10);

    const finished = useWorkoutStore.getState().finishWorkout(false, { duration: 8 });

    expect(finished).toMatchObject({
      reps: 0,
      duration: 8,
      calories: 0,
      completed: false,
    });
    expect(useWorkoutStore.getState().workouts).toHaveLength(1);
    expect(useWorkoutStore.getState().workouts[0].completed).toBe(false);
    expect(useWorkoutStore.getState().lastCompletedWorkout?.completed).toBe(false);
  });

  it('clears the last completed snapshot when the active attempt is discarded', () => {
    useWorkoutStore.getState().startWorkout('open', 'faceFocus', 10);
    const finished = useWorkoutStore.getState().finishWorkout(true, { duration: 5 });
    expect(useWorkoutStore.getState().lastCompletedWorkout?.id).toBe(finished?.id);

    useWorkoutStore.getState().startWorkout('open', 'faceFocus', 10);
    useWorkoutStore.getState().discardWorkout();

    expect(useWorkoutStore.getState().lastCompletedWorkout).toBeNull();
  });
});

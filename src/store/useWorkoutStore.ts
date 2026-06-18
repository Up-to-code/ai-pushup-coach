import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { customStorage } from './storage';

export type WorkoutType = 'open' | 'timer' | 'limit' | 'sets';
export type TrainingCameraMode = 'faceFocus' | 'fullScene';
export type CameraPresentationState =
  | 'permission'
  | 'preparing'
  | 'tracking'
  | 'manualFallback'
  | 'unavailable';
export type FormFeedbackState = 'good' | 'tooFast' | 'badForm' | 'incomplete';

export interface Workout {
  id: string;
  date: string;
  type: WorkoutType;
  trainingCameraMode: TrainingCameraMode;
  reps: number;
  duration: number;
  calories: number;
  completed: boolean;
  goal?: number;
  sets?: number[];
  restTime?: number;
  startTime?: number;
  formFeedbackState?: FormFeedbackState;
  cameraPresentationState?: CameraPresentationState;
  qualityScore?: number;
  synced?: boolean;
  appleHealthSyncedAt?: number;
}

interface WorkoutState {
  workouts: Workout[];
  currentWorkout: Partial<Workout> | null;
  lastCompletedWorkout: Workout | null;
  isActive: boolean;
  isPaused: boolean;
  addWorkout: (workout: Workout) => void;
  startWorkout: (
    type: WorkoutType,
    trainingCameraMode?: TrainingCameraMode,
    goal?: number,
    sets?: number[],
    restTime?: number
  ) => void;
  updateCurrentWorkout: (updates: Partial<Workout>) => void;
  endWorkout: (completed?: boolean) => void;
  finishWorkout: (completed?: boolean, updates?: Partial<Workout>) => Workout | null;
  discardWorkout: () => void;
  incrementReps: () => void;
  decrementReps: () => void;
  updateDuration: (duration: number) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  clearWorkouts: () => void;
  markWorkoutSynced: (id: string) => void;
  markWorkoutAppleHealthSynced: (id: string, syncedAt?: number) => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      workouts: [],
      currentWorkout: null,
      lastCompletedWorkout: null,
      isActive: false,
      isPaused: false,

      addWorkout: (workout) =>
        set((state) => ({
          workouts: [...state.workouts, workout],
        })),

      startWorkout: (type, trainingCameraMode = 'faceFocus', goal, sets, restTime) => {
        const now = Date.now();
        set({
          currentWorkout: {
            id: `workout-${now}`,
            date: new Date().toISOString(),
            type,
            trainingCameraMode,
            reps: 0,
            duration: 0,
            calories: 0,
            completed: false,
            goal,
            sets,
            restTime,
            startTime: now,
            formFeedbackState: 'good',
            cameraPresentationState: 'preparing',
            qualityScore: 84,
          },
          isActive: true,
          isPaused: false,
        });
      },

      updateCurrentWorkout: (updates) =>
        set((state) => ({
          currentWorkout: state.currentWorkout
            ? { ...state.currentWorkout, ...updates }
            : null,
        })),

      endWorkout: (completed = true) => {
        const state = get();
        if (state.currentWorkout) {
          const completedWorkout: Workout = {
            ...state.currentWorkout,
            completed,
            duration: state.currentWorkout.duration || 0,
            calories: Math.round((state.currentWorkout.reps || 0) * 0.29),
            synced: false,
          } as Workout;

          set((s) => ({
            workouts: [...s.workouts, completedWorkout].slice(-50),
            currentWorkout: null,
            lastCompletedWorkout: completedWorkout,
            isActive: false,
            isPaused: false,
          }));
        }
      },

      finishWorkout: (completed = true, updates = {}) => {
        const state = get();
        if (!state.currentWorkout) {
          return null;
        }

        const mergedWorkout = { ...state.currentWorkout, ...updates };
        const completedWorkout: Workout = {
          ...mergedWorkout,
          completed,
          completedAt: Date.now(), // optional tracking
          duration: mergedWorkout.duration || 0,
          reps: mergedWorkout.reps || 0,
          calories: Math.round((mergedWorkout.reps || 0) * 0.29),
          synced: false,
        } as Workout;

        const newWorkouts = [
          ...state.workouts.filter((workout) => workout.id !== completedWorkout.id),
          completedWorkout,
        ];

        set({
          workouts: newWorkouts.slice(-50),
          currentWorkout: null,
          lastCompletedWorkout: completedWorkout,
          isActive: false,
          isPaused: false,
        });

        return completedWorkout;
      },

      discardWorkout: () =>
        set({
          currentWorkout: null,
          lastCompletedWorkout: null,
          isActive: false,
          isPaused: false,
        }),

      incrementReps: () =>
        set((state) => ({
          currentWorkout: state.currentWorkout
            ? {
                ...state.currentWorkout,
                reps: (state.currentWorkout.reps || 0) + 1,
              }
            : null,
        })),

      decrementReps: () =>
        set((state) => ({
          currentWorkout: state.currentWorkout
            ? {
                ...state.currentWorkout,
                reps: Math.max(0, (state.currentWorkout.reps || 0) - 1),
              }
            : null,
        })),

      updateDuration: (duration) =>
        set((state) => ({
          currentWorkout: state.currentWorkout
            ? { ...state.currentWorkout, duration }
            : null,
        })),

      pauseWorkout: () => set({ isPaused: true }),
      resumeWorkout: () => set({ isPaused: false }),
      clearWorkouts: () =>
        set({
          workouts: [],
          currentWorkout: null,
          lastCompletedWorkout: null,
          isActive: false,
          isPaused: false,
        }),
      markWorkoutSynced: (id) =>
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id === id ? { ...w, synced: true } : w
          ),
          lastCompletedWorkout:
            state.lastCompletedWorkout?.id === id
              ? { ...state.lastCompletedWorkout, synced: true }
              : state.lastCompletedWorkout,
        })),
      markWorkoutAppleHealthSynced: (id, syncedAt = Date.now()) =>
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id === id ? { ...w, appleHealthSyncedAt: syncedAt } : w
          ),
          lastCompletedWorkout:
            state.lastCompletedWorkout?.id === id
              ? { ...state.lastCompletedWorkout, appleHealthSyncedAt: syncedAt }
              : state.lastCompletedWorkout,
        })),
    }),
    {
      name: 'workout-storage',
      storage: customStorage,
      partialize: (state) => ({
        workouts: state.workouts,
        lastCompletedWorkout: state.lastCompletedWorkout,
      }),
    }
  )
);

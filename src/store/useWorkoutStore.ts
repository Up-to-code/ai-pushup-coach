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
}

interface WorkoutState {
  workouts: Workout[];
  currentWorkout: Partial<Workout> | null;
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
  endWorkout: () => void;
  incrementReps: () => void;
  decrementReps: () => void;
  updateDuration: (duration: number) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  clearWorkouts: () => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      workouts: [],
      currentWorkout: null,
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

      endWorkout: () => {
        const state = get();
        if (state.currentWorkout) {
          const completedWorkout: Workout = {
            ...state.currentWorkout,
            completed: true,
            duration: state.currentWorkout.duration || 0,
            calories: Math.round((state.currentWorkout.reps || 0) * 0.29),
          } as Workout;

          set((s) => ({
            workouts: [...s.workouts, completedWorkout],
            currentWorkout: null,
            isActive: false,
            isPaused: false,
          }));
        }
      },

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
      clearWorkouts: () => set({ workouts: [] }),
    }),
    {
      name: 'workout-storage',
      storage: customStorage,
      partialize: (state) => ({ workouts: state.workouts }),
    }
  )
);

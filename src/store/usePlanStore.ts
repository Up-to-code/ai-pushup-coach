import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { customStorage } from './storage';

export type PlanLevel = 'beginner' | 'intermediate' | 'advanced';
export type PlanGoal = 'first_25' | 'road_50' | 'road_100';
export type DayStatus = 'completed' | 'current' | 'locked' | 'rest' | 'missed';

export interface Day {
  day: number;
  date: string;
  scheduledAt?: string;
  status: DayStatus;
  sets?: number[];
  targetReps?: number;
  restTime?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface Plan {
  id: string;
  name: string;
  level: PlanLevel;
  goal: PlanGoal;
  trainingDays: string[];
  preferredTime: string;
  notificationIds: string[];
  currentDayIndex: number;
  duration: string;
  totalDays: number;
  completedDays: number;
  days: Day[];
}

export interface PlanSetupDraft {
  level?: PlanLevel;
  goal?: PlanGoal;
  trainingDays: string[];
  preferredTime?: string;
}

interface PlanState {
  plan: Plan | null;
  activeDay: number;
  setupDraft: PlanSetupDraft;
  setPlan: (plan: Plan) => void;
  updateSetupDraft: (updates: Partial<PlanSetupDraft>) => void;
  updateDayStatus: (dayIndex: number, status: DayStatus) => void;
  updatePlan: (updates: Partial<Plan>) => void;
  markCurrentDayStarted: () => void;
  markCurrentDayCompleted: () => void;
  setActiveDay: (day: number) => void;
  incrementCompletedDays: () => void;
  resetPlan: () => void;
}

const defaultTrainingDays = ['mon', 'wed', 'fri'];

function normalizePlan(plan: Plan | null | undefined): Plan | null {
  if (!plan) return null;

  const days = Array.isArray(plan.days) ? plan.days : [];
  const currentDayIndex =
    Number.isInteger(plan.currentDayIndex) && plan.currentDayIndex >= 0
      ? Math.min(plan.currentDayIndex, Math.max(0, days.length - 1))
      : Math.max(0, days.findIndex((day) => day.status === 'current'));

  return {
    ...plan,
    trainingDays: Array.isArray(plan.trainingDays) && plan.trainingDays.length
      ? plan.trainingDays
      : defaultTrainingDays,
    preferredTime: typeof plan.preferredTime === 'string' && plan.preferredTime
      ? plan.preferredTime
      : '07:30',
    notificationIds: Array.isArray(plan.notificationIds) ? plan.notificationIds : [],
    days,
    currentDayIndex: Math.max(0, currentDayIndex),
    totalDays: typeof plan.totalDays === 'number' ? plan.totalDays : days.length,
    completedDays: typeof plan.completedDays === 'number'
      ? plan.completedDays
      : days.filter((day) => day.status === 'completed').length,
  };
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      plan: null,
      activeDay: 0,
      setupDraft: {
        trainingDays: [],
      },
      setPlan: (plan) => set({ plan: normalizePlan(plan) }),
      updateSetupDraft: (updates) =>
        set((state) => ({
          setupDraft: {
            ...state.setupDraft,
            ...updates,
            trainingDays: updates.trainingDays ?? state.setupDraft.trainingDays,
          },
        })),
      updateDayStatus: (dayIndex, status) =>
        set((state) => {
          if (!state.plan) return state;
          const newDays = [...state.plan.days];
          newDays[dayIndex] = { ...newDays[dayIndex], status };
          return {
            plan: {
              ...state.plan,
              days: newDays,
              completedDays:
                status === 'completed'
                  ? state.plan.completedDays + 1
                  : state.plan.completedDays,
            },
          };
        }),
      updatePlan: (updates) =>
        set((state) => ({
          plan: state.plan ? normalizePlan({ ...state.plan, ...updates }) : state.plan,
        })),
      markCurrentDayStarted: () =>
        set((state) => {
          if (!state.plan) return state;
          const index = state.plan.currentDayIndex;
          const days = [...state.plan.days];
          const day = days[index];
          if (!day || day.status === 'rest' || day.completedAt) return state;
          days[index] = { ...day, startedAt: new Date().toISOString(), status: 'current' };
          return { plan: { ...state.plan, days } };
        }),
      markCurrentDayCompleted: () =>
        set((state) => {
          if (!state.plan) return state;
          const index = state.plan.currentDayIndex;
          const days = [...state.plan.days];
          const day = days[index];
          if (!day || day.status === 'rest' || day.status === 'completed') return state;

          days[index] = {
            ...day,
            status: 'completed',
            completedAt: new Date().toISOString(),
          };

          const nextWorkoutIndex = days.findIndex(
            (candidate, candidateIndex) =>
              candidateIndex > index &&
              candidate.status !== 'rest' &&
              candidate.status !== 'completed'
          );

          if (nextWorkoutIndex >= 0) {
            days[nextWorkoutIndex] = { ...days[nextWorkoutIndex], status: 'current' };
          }

          return {
            activeDay: nextWorkoutIndex >= 0 ? nextWorkoutIndex : index,
            plan: {
              ...state.plan,
              days,
              currentDayIndex: nextWorkoutIndex >= 0 ? nextWorkoutIndex : index,
              completedDays: days.filter((candidate) => candidate.status === 'completed').length,
            },
          };
        }),
      setActiveDay: (day) => set({ activeDay: day }),
      incrementCompletedDays: () =>
        set((state) => ({
          plan: state.plan
            ? {
                ...state.plan,
                completedDays: state.plan.completedDays + 1,
              }
            : state.plan,
        })),
      resetPlan: () => set({ plan: null, activeDay: 0, setupDraft: { trainingDays: [] } }),
    }),
    {
      name: 'plan-storage',
      storage: customStorage,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PlanState> | undefined;

        return {
          ...currentState,
          ...persisted,
          setupDraft: {
            ...currentState.setupDraft,
            ...persisted?.setupDraft,
            trainingDays: Array.isArray(persisted?.setupDraft?.trainingDays)
              ? persisted.setupDraft.trainingDays
              : currentState.setupDraft.trainingDays,
          },
          plan: normalizePlan(persisted?.plan ?? currentState.plan),
        };
      },
    }
  )
);

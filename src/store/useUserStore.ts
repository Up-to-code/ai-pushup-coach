import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { customStorage } from './storage';

export interface SocialLinks {
  x?: string;
  github?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
}

export interface User {
  id: string;
  displayName: string;
  name: string;
  nickname: string;
  bio?: string;
  coachTone: 'balanced' | 'jokey' | 'strict';
  personalityTags: string[];
  countryCode: string;
  countryName: string;
  avatar?: string;
  proStatus: 'free' | 'pro';
  subscriptionStatus?: 'free' | 'pro' | 'expired' | 'unknown';
  subscriptionProvider?: 'adapty' | 'development' | 'none';
  activeProductIdentifier?: string;
  activeAccessLevelId?: string;
  subscriptionUpdatedAt?: number;
  subscriptionOwnerUserId?: string;
  createdAt: string;
  streak: number;
  energy: number;
  totalReps: number;
  bestReps: number;
  socialLinks?: SocialLinks;
}

interface UserState {
  user: User;
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  updateProStatus: (status: 'free' | 'pro') => void;
  resetUser: () => void;
}

const defaultUser: User = {
  id: 'local-user',
  displayName: 'Athlete',
  name: 'Athlete',
  nickname: 'Coach',
  bio: '',
  coachTone: 'balanced',
  personalityTags: [],
  countryCode: 'GLOBAL',
  countryName: 'Earth',
  proStatus: 'free',
  createdAt: new Date().toISOString(),
  streak: 0,
  energy: 100,
  totalReps: 0,
  bestReps: 0,
};

function valuesEqual(left: unknown, right: unknown) {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
  }

  return false;
}

function hasChanges<T extends object>(current: T, updates: Partial<T>) {
  return Object.entries(updates).some(([key, value]) => !valuesEqual(current[key as keyof T], value));
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: defaultUser,
      setUser: (user) => set({ user }),
      updateUser: (updates) =>
        set((state) => {
          if (!hasChanges(state.user, updates)) {
            return state;
          }

          return {
            user: { ...state.user, ...updates },
          };
        }),
      updateProStatus: (status) =>
        set((state) => {
          if (state.user.proStatus === status) {
            return state;
          }

          return {
            user: { ...state.user, proStatus: status },
          };
        }),
      resetUser: () => set({ user: defaultUser }),
    }),
    {
      name: 'user-storage',
      storage: customStorage,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<UserState> | undefined;
        const persistedUser = persisted?.user;
        const hasLegacySeedUser =
          persistedUser?.id === 'user-ahmed' ||
          persistedUser?.nickname === 'Ahmed Flex' ||
          (persistedUser?.totalReps === 248 && persistedUser?.bestReps === 78);
        const nextUser = hasLegacySeedUser
          ? currentState.user
          : { ...currentState.user, ...persistedUser };
        const persistedCreatedAt = (nextUser as { createdAt?: unknown }).createdAt;

        if (typeof persistedCreatedAt === 'number') {
          nextUser.createdAt = new Date(persistedCreatedAt).toISOString();
        } else if (typeof persistedCreatedAt !== 'string') {
          nextUser.createdAt = currentState.user.createdAt;
        }

        return {
          ...currentState,
          ...persisted,
          user: nextUser,
        };
      },
    }
  )
);

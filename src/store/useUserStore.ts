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

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: defaultUser,
      setUser: (user) => set({ user }),
      updateUser: (updates) =>
        set((state) => ({
          user: { ...state.user, ...updates },
        })),
      updateProStatus: (status) =>
        set((state) => ({
          user: { ...state.user, proStatus: status },
        })),
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

        return {
          ...currentState,
          ...persisted,
          user: hasLegacySeedUser ? currentState.user : { ...currentState.user, ...persistedUser },
        };
      },
    }
  )
);

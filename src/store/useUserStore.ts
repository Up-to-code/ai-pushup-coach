import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { customStorage } from './storage';

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
}

interface UserState {
  user: User;
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  updateProStatus: (status: 'free' | 'pro') => void;
  resetUser: () => void;
}

const defaultUser: User = {
  id: 'user-ahmed',
  displayName: 'Ahmed',
  name: 'Ahmed',
  nickname: 'Ahmed Flex',
  bio: 'Pushing boundaries, one rep at a time.',
  coachTone: 'balanced',
  personalityTags: ['friendly', 'competitive'],
  countryCode: 'EG',
  countryName: 'Egypt',
  proStatus: 'free',
  createdAt: new Date().toISOString(),
  streak: 5,
  energy: 82,
  totalReps: 248,
  bestReps: 78,
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
    }
  )
);

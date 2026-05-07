import { create } from 'zustand';

export type AuthActionStatus = 'idle' | 'signingIn' | 'settling';

type AuthActionState = {
  authActionStatus: AuthActionStatus;
  setAuthActionStatus: (status: AuthActionStatus) => void;
};

export const useAuthActionStore = create<AuthActionState>((set) => ({
  authActionStatus: 'idle',
  setAuthActionStatus: (authActionStatus) => set({ authActionStatus }),
}));

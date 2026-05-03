import { useMemo } from 'react';
import { authClient } from './authClient';

export function useBetterAuth() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  return useMemo(
    () => ({
      isLoaded: !isPending,
      isSignedIn: Boolean(session?.session && user),
      userId: user?.id,
      user,
      signOut: authClient.signOut,
    }),
    [isPending, session?.session, user]
  );
}

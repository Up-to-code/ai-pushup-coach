import { useCallback, useMemo } from 'react';
import { authClient } from './authClient';

export function useBetterAuth() {
  const sessionQuery = authClient.useSession();
  const { data: session, isPending, refetch } = sessionQuery;
  const user = session?.user;
  const refreshSession = useCallback(async () => {
    const result = await authClient.getSession();
    await refetch();
    return result.data ?? null;
  }, [refetch]);

  return useMemo(
    () => ({
      isLoaded: !isPending,
      isSignedIn: Boolean(session?.session && user),
      userId: user?.id,
      user,
      signOut: authClient.signOut,
      refreshSession,
    }),
    [isPending, refreshSession, session?.session, user]
  );
}

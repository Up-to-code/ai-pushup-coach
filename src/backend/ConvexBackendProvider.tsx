import React, { PropsWithChildren, useMemo } from 'react';
import { ConvexReactClient } from 'convex/react';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { authClient } from '../auth';
import { BackendSync } from './BackendSync';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

export function ConvexBackendProvider({ children }: PropsWithChildren) {
  const client = useMemo(() => {
    if (!convexUrl) {
      return null;
    }

    return new ConvexReactClient(convexUrl);
  }, []);

  if (!client) {
    return <>{children}</>;
  }

  return (
    <ConvexBetterAuthProvider client={client} authClient={authClient}>
      <BackendSync />
      {children}
    </ConvexBetterAuthProvider>
  );
}

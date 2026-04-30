import React, { PropsWithChildren, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
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
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      <BackendSync />
      {children}
    </ConvexProviderWithClerk>
  );
}

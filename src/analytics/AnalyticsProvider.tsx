import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import type { PostHogEventProperties } from '@posthog/core';
import { useBetterAuth } from '../auth';
import { hasPosthogConfig, posthogApiKey, posthogHost } from './config';

function PostHogIdentitySync() {
  const posthog = usePostHog();
  const { isLoaded, isSignedIn, user, userId } = useBetterAuth();
  const identifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !userId) {
      if (identifiedUserIdRef.current) {
        posthog.reset();
        identifiedUserIdRef.current = null;
      }
      return;
    }

    if (identifiedUserIdRef.current === userId) {
      return;
    }

    posthog.identify(userId, {
      ...(user?.email ? { email: user.email } : {}),
      ...(user?.name ? { name: user.name } : {}),
    });
    identifiedUserIdRef.current = userId;
  }, [isLoaded, isSignedIn, posthog, user?.email, user?.name, userId]);

  return null;
}

export function AnalyticsProvider({ children }: PropsWithChildren) {
  if (!hasPosthogConfig()) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider
      apiKey={posthogApiKey}
      options={{
        host: posthogHost,
        captureAppLifecycleEvents: true,
      }}
      autocapture={{
        captureScreens: false,
        captureTouches: false,
      }}
    >
      <PostHogIdentitySync />
      {children}
    </PostHogProvider>
  );
}

export function useAnalytics() {
  const posthog = usePostHog() as ReturnType<typeof usePostHog> | undefined;

  return {
    capture(eventName: string, properties?: PostHogEventProperties) {
      posthog?.capture(eventName, properties);
    },
    captureError(error: unknown, properties?: PostHogEventProperties) {
      const errorObject = error instanceof Error ? error : new Error(String(error));
      posthog?.capture('$exception', {
        $exception_message: errorObject.message,
        $exception_type: errorObject.name,
        $exception_stack_trace_raw: errorObject.stack ?? null,
        ...properties,
      });
    },
  };
}

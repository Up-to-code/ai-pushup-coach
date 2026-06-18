import { PostHog } from '@posthog/convex';
import type { Scheduler } from 'convex/server';
import { components } from './_generated/api';

export const posthog = new PostHog(components.posthog, {
  apiKey: process.env.POSTHOG_API_KEY,
  host: process.env.POSTHOG_HOST,
});

type CaptureCtx = {
  scheduler: Scheduler;
};

type CaptureInput = {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
};

export async function capturePosthogEvent(ctx: CaptureCtx, input: CaptureInput) {
  if (!process.env.POSTHOG_API_KEY) {
    return;
  }

  try {
    await posthog.capture(ctx, {
      distinctId: input.distinctId,
      event: input.event,
      properties: input.properties,
    });
  } catch (error) {
    console.warn('PostHog capture failed', error);
  }
}

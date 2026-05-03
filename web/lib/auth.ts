import { convexBetterAuthNextJs } from '@convex-dev/better-auth/nextjs';
import { convexSiteUrl, convexUrl } from './config';

function unavailable() {
  return new Response('Push Counter auth is not configured for this deployment.', { status: 503 });
}

export const betterAuth =
  convexUrl && convexSiteUrl
    ? convexBetterAuthNextJs({
        convexUrl,
        convexSiteUrl,
      })
    : {
        handler: {
          GET: unavailable,
          POST: unavailable,
        },
      };

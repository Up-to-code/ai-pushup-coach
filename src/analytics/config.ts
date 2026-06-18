export const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY?.trim() || '';
export const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

export function hasPosthogConfig() {
  return posthogApiKey.length > 0;
}

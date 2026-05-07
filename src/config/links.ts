const fallbackWebUrl = 'https://www.pushcounter.online';
export const fallbackConvexUrl = 'https://mellow-gerbil-151.convex.cloud';
export const fallbackConvexSiteUrl = 'https://mellow-gerbil-151.convex.site';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export const appWebUrl = trimTrailingSlash(process.env.EXPO_PUBLIC_WEB_URL ?? fallbackWebUrl);

export const authBaseUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_AUTH_BASE_URL ??
    process.env.EXPO_PUBLIC_CONVEX_SITE_URL ??
    process.env.EXPO_PUBLIC_WEB_URL ??
    fallbackConvexSiteUrl
);

export const privacyUrl = `${appWebUrl}/privacy`;
export const termsUrl = `${appWebUrl}/terms`;
export const supportUrl = `${appWebUrl}/support`;
export const authCallbackPath = '/auth/callback';
export const authCallbackUrl = `pushcounter://${authCallbackPath}`;
export const appleOAuthRedirectUrl = `${authBaseUrl}/api/auth/callback/apple`;
export const googleOAuthRedirectUrl = `${authBaseUrl}/api/auth/callback/google`;

export function profileShareUrl(clientUserId: string) {
  return `${appWebUrl}/u/${encodeURIComponent(clientUserId)}`;
}

export function profileConnectUrl(clientUserId: string) {
  return `${appWebUrl}/connect/u/${encodeURIComponent(clientUserId)}`;
}

const fallbackWebUrl = 'https://www.pushcounter.online';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export const appWebUrl = trimTrailingSlash(process.env.EXPO_PUBLIC_WEB_URL ?? fallbackWebUrl);

export const authBaseUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_AUTH_BASE_URL ??
    process.env.EXPO_PUBLIC_CONVEX_SITE_URL ??
    process.env.EXPO_PUBLIC_WEB_URL ??
    fallbackWebUrl
);

export const privacyUrl = `${appWebUrl}/privacy`;
export const termsUrl = `${appWebUrl}/terms`;
export const supportUrl = `${appWebUrl}/support`;
export const appleOAuthRedirectUrl = `${authBaseUrl}/api/auth/callback/apple`;

export function profileShareUrl(clientUserId: string) {
  return `${appWebUrl}/u/${encodeURIComponent(clientUserId)}`;
}

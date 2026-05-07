export const webUrl = (process.env.NEXT_PUBLIC_WEB_URL ?? 'https://www.pushcounter.online').replace(/\/+$/, '');
export const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? '';
export const convexSiteUrl = process.env.CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? '';

export const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL ?? '';
export const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@nexfiy.com';
export const iosBundleId = process.env.NEXT_PUBLIC_IOS_BUNDLE_ID ?? 'com.aipushupcoach.app';
export const appleTeamId = process.env.APPLE_TEAM_ID ?? process.env.NEXT_PUBLIC_APPLE_TEAM_ID ?? 'U7JF269T76';
export const androidPackageName = process.env.NEXT_PUBLIC_ANDROID_PACKAGE ?? 'com.ahmedmansour.pushcounter';
export const androidSha256CertFingerprints = (process.env.NEXT_PUBLIC_ANDROID_SHA256_CERT_FINGERPRINTS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

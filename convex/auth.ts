import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import type { BetterAuthOptions } from 'better-auth';
import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import authConfig from './auth.config';

const siteUrl = process.env.SITE_URL ?? process.env.CONVEX_SITE_URL;

function getHost(value?: string) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return value.replace(/^https?:\/\//, '').replace(/\/.*$/, '') || null;
  }
}

function getAuthBaseURL(): BetterAuthOptions['baseURL'] {
  const allowedHosts = [
    getHost(process.env.WEB_URL),
    getHost(process.env.NEXT_PUBLIC_WEB_URL),
    getHost(process.env.AUTH_BASE_URL),
    getHost(siteUrl),
    process.env.NODE_ENV === 'development' ? 'localhost:3000' : null,
  ].filter((host): host is string => Boolean(host));

  if (allowedHosts.length === 0) return siteUrl;

  return {
    allowedHosts: Array.from(new Set(allowedHosts)),
    protocol: process.env.NODE_ENV === 'development' ? 'http' : 'https',
    fallback: siteUrl,
  };
}

function getTrustedOrigins() {
  const origins = [
    process.env.WEB_URL,
    process.env.NEXT_PUBLIC_WEB_URL,
    process.env.AUTH_BASE_URL,
    process.env.SITE_URL,
    'https://appleid.apple.com',
    'pushcounter://',
    'pushcounter://*',
  ].filter((origin): origin is string => Boolean(origin));

  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000', 'exp://', 'exp://**', 'exp://192.168.*.*:*/**');
  }

  return Array.from(new Set(origins));
}

export const authComponent = createClient<DataModel>(components.betterAuth);

function getSocialProviders(): BetterAuthOptions['socialProviders'] {
  const socialProviders: BetterAuthOptions['socialProviders'] = {};

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }

  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
    socialProviders.apple = {
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
      appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER,
    };
  }

  return socialProviders;
}

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    appName: 'Push Counter',
    baseURL: getAuthBaseURL(),
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    trustedOrigins: getTrustedOrigins(),
    socialProviders: getSocialProviders(),
    plugins: [expo(), convex({ authConfig })],
  });

export const { getAuthUser } = authComponent.clientApi();

export async function requireMatchingIdentity(
  ctx: MutationCtx | QueryCtx,
  clientUserId: string
) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error('Authentication required.');
  }

  if (identity.subject !== clientUserId) {
    throw new Error('Authenticated user does not match requested user.');
  }

  return identity;
}

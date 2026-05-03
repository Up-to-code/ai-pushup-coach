import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { convexUrl } from './config';

export type SharedProfile = Awaited<ReturnType<typeof getSharedProfile>>;

export async function getSharedProfile(userId: string) {
  if (!convexUrl) return null;

  const client = new ConvexHttpClient(convexUrl);
  return await client.query(api.users.sharedProfile, { userId });
}

import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { convexUrl } from './config';

export type SharedProfile = Awaited<ReturnType<typeof getSharedProfile>>;

type SharedProfileResult = {
  clientUserId: string;
  displayName: string;
  nickname: string;
  bio?: string;
  countryCode: string;
  countryName: string;
  avatar?: string;
  streak: number;
  totalReps: number;
  bestReps: number;
  followersCount: number;
  followingCount: number;
  updatedAt: number;
} | null;

const sharedProfileQuery = makeFunctionReference<'query', { userId: string }, SharedProfileResult>('users:sharedProfile');

export async function getSharedProfile(userId: string) {
  if (!convexUrl) return null;

  const client = new ConvexHttpClient(convexUrl);
  return await client.query(sharedProfileQuery, { userId });
}

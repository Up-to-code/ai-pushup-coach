import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireMatchingIdentity } from './auth';
import { assertRateLimit } from './rateLimit';
import { assertActiveUser } from './deletedUsers';
import { isRealCountryCode } from './leaderboardLogic';
import { summarizeFeatureHealth } from './appHealth';

export const logWorkoutEvent = mutation({
  args: {
    clientUserId: v.string(),
    clientWorkoutId: v.string(),
    type: v.union(
      v.literal('sessionStarted'),
      v.literal('repCounted'),
      v.literal('phaseChanged'),
      v.literal('formFeedback'),
      v.literal('cameraState'),
      v.literal('sessionPaused'),
      v.literal('sessionResumed'),
      v.literal('sessionEnded')
    ),
    rep: v.optional(v.number()),
    phase: v.optional(v.string()),
    formFeedbackState: v.optional(v.string()),
    cameraPresentationState: v.optional(v.string()),
    message: v.optional(v.string()),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireMatchingIdentity(ctx, args.clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', args.clientUserId))
      .unique();
    if (!user) {
      return null;
    }
    assertActiveUser(user);
    
    await assertRateLimit(ctx, {
      userId: user._id,
      bucket: 'logWorkoutEvent',
      limit: 5000,
      windowMs: 60 * 60 * 1000,
    });
    const workout = await ctx.db
      .query('workoutResults')
      .withIndex('by_client_workout_id', (q) => q.eq('clientWorkoutId', args.clientWorkoutId))
      .unique();
    if (!workout) {
      return null;
    }

    return await ctx.db.insert('workoutEvents', {
      workoutId: workout._id,
      userId: user._id,
      type: args.type,
      rep: args.rep,
      phase: args.phase,
      formFeedbackState: args.formFeedbackState,
      cameraPresentationState: args.cameraPresentationState,
      message: args.message,
      timestamp: args.timestamp ?? Date.now(),
    });
  },
});

export const logFaceTrackingSample = mutation({
  args: {
    clientUserId: v.string(),
    clientWorkoutId: v.string(),
    timestamp: v.optional(v.number()),
    faceDetected: v.boolean(),
    faceHeight: v.number(),
    centerX: v.number(),
    centerY: v.number(),
    trackingPhase: v.optional(v.string()),
    trackingProblem: v.optional(v.string()),
    brightnessState: v.optional(v.union(v.literal('ok'), v.literal('dark'), v.literal('unknown'))),
  },
  handler: async (ctx, args) => {
    await requireMatchingIdentity(ctx, args.clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', args.clientUserId))
      .unique();
    if (!user) {
      return null;
    }
    assertActiveUser(user);

    await assertRateLimit(ctx, {
      userId: user._id,
      bucket: 'logFaceTrackingSample',
      limit: 10000,
      windowMs: 60 * 60 * 1000,
    });
    const workout = await ctx.db
      .query('workoutResults')
      .withIndex('by_client_workout_id', (q) => q.eq('clientWorkoutId', args.clientWorkoutId))
      .unique();
    if (!workout) {
      return null;
    }

    return await ctx.db.insert('faceTrackingSamples', {
      workoutId: workout._id,
      userId: user._id,
      timestamp: args.timestamp ?? Date.now(),
      faceDetected: args.faceDetected,
      faceHeight: args.faceHeight,
      centerX: args.centerX,
      centerY: args.centerY,
      trackingPhase: args.trackingPhase,
      trackingProblem: args.trackingProblem,
      brightnessState: args.brightnessState,
    });
  },
});

export const recentWorkoutEvents = query({
  args: {
    clientUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { clientUserId, limit }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();
    if (!user) {
      return [];
    }

    const rows = await ctx.db
      .query('workoutEvents')
      .withIndex('by_user_time', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(Math.min(limit ?? 100, 100));
    const workouts = await Promise.all(rows.map((row) => ctx.db.get(row.workoutId)));

    return rows.map((row, index) => ({
      id: row._id,
      workoutId: row.workoutId,
      clientWorkoutId: workouts[index]?.clientWorkoutId ?? '',
      type: row.type,
      rep: row.rep,
      phase: row.phase,
      formFeedbackState: row.formFeedbackState,
      cameraPresentationState: row.cameraPresentationState,
      message: row.message,
      timestamp: row.timestamp,
    }));
  },
});

export const recentFaceTrackingIssues = query({
  args: {
    clientUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { clientUserId, limit }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();
    if (!user) {
      return {
        totalSamples: 0,
        issueSamples: 0,
        noFaceSamples: 0,
        darkSamples: 0,
        offCenterSamples: 0,
        byProblem: [] as Array<{ problem: string; count: number }>,
        recent: [] as Array<{
          id: string;
          workoutId: string;
          trackingPhase?: string;
          trackingProblem?: string;
          brightnessState?: 'ok' | 'dark' | 'unknown';
          faceDetected: boolean;
          centerX: number;
          centerY: number;
          faceHeight: number;
          timestamp: number;
        }>,
      };
    }

    const rows = await ctx.db
      .query('faceTrackingSamples')
      .withIndex('by_user_time', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(Math.min(limit ?? 100, 100));
    const problemCounts = new Map<string, number>();
    let issueSamples = 0;
    let noFaceSamples = 0;
    let darkSamples = 0;
    let offCenterSamples = 0;

    rows.forEach((row) => {
      const problem = row.trackingProblem;
      const offCenter = row.faceDetected && (Math.abs(row.centerX - 0.5) > 0.22 || Math.abs(row.centerY - 0.5) > 0.28);
      const isIssue = !row.faceDetected || row.brightnessState === 'dark' || offCenter || (problem !== undefined && problem !== 'none');
      if (!isIssue) return;

      issueSamples += 1;
      if (!row.faceDetected) noFaceSamples += 1;
      if (row.brightnessState === 'dark') darkSamples += 1;
      if (offCenter) offCenterSamples += 1;
      const key = problem && problem !== 'none' ? problem : !row.faceDetected ? 'noFace' : row.brightnessState === 'dark' ? 'dark' : 'offCenter';
      problemCounts.set(key, (problemCounts.get(key) ?? 0) + 1);
    });

    return {
      totalSamples: rows.length,
      issueSamples,
      noFaceSamples,
      darkSamples,
      offCenterSamples,
      byProblem: [...problemCounts.entries()]
        .map(([problem, count]) => ({ problem, count }))
        .sort((a, b) => b.count - a.count),
      recent: rows
        .filter((row) => !row.faceDetected || row.brightnessState === 'dark' || (row.trackingProblem !== undefined && row.trackingProblem !== 'none'))
        .slice(0, 20)
        .map((row) => ({
          id: row._id,
          workoutId: row.workoutId,
          trackingPhase: row.trackingPhase,
          trackingProblem: row.trackingProblem,
          brightnessState: row.brightnessState,
          faceDetected: row.faceDetected,
          centerX: row.centerX,
          centerY: row.centerY,
          faceHeight: row.faceHeight,
          timestamp: row.timestamp,
        })),
    };
  },
});

export const appHealthSnapshot = query({
  args: {
    clientUserId: v.string(),
  },
  handler: async (ctx, { clientUserId }) => {
    await requireMatchingIdentity(ctx, clientUserId);

    const user = await ctx.db
      .query('users')
      .withIndex('by_client_user_id', (q) => q.eq('clientUserId', clientUserId))
      .unique();

    if (!user) {
      const features = summarizeFeatureHealth({
        hasUser: false,
        hasRealCountry: false,
        hasSettings: false,
        workoutsCount: 0,
        completedWorkoutsCount: 0,
        dailyStatsCount: 0,
        workoutEventsCount: 0,
        trackingSamplesCount: 0,
        challengeCount: 0,
        challengeMembershipCount: 0,
        feedbackCount: 0,
        feedbackVoteCount: 0,
        followersCount: 0,
        followingCount: 0,
        unreadNotificationsCount: 0,
        posthogConfigured: Boolean(process.env.POSTHOG_API_KEY && process.env.POSTHOG_HOST),
      });

      return {
        clientUserId,
        generatedAt: Date.now(),
        user: null,
        counts: null,
        features,
      };
    }

    assertActiveUser(user);

    const [
      settings,
      workouts,
      dailyStats,
      workoutEvents,
      trackingSamples,
      challenges,
      challengeMemberships,
      feedbackRequests,
      feedbackVotes,
      followers,
      following,
      notifications,
    ] = await Promise.all([
      ctx.db.query('userSettings').withIndex('by_user_id', (q) => q.eq('userId', user._id)).unique(),
      ctx.db.query('workoutResults').withIndex('by_user_date', (q) => q.eq('userId', user._id)).take(1000),
      ctx.db.query('dailyStats').withIndex('by_user_day', (q) => q.eq('userId', user._id)).take(1000),
      ctx.db.query('workoutEvents').withIndex('by_user_time', (q) => q.eq('userId', user._id)).take(1000),
      ctx.db.query('faceTrackingSamples').withIndex('by_user_time', (q) => q.eq('userId', user._id)).take(1000),
      ctx.db.query('challenges').take(1000),
      ctx.db.query('challengeMembers').withIndex('by_user', (q) => q.eq('userId', user._id)).take(1000),
      ctx.db.query('feedbackRequests').withIndex('by_author', (q) => q.eq('authorUserId', user._id)).take(1000),
      ctx.db.query('feedbackVotes').withIndex('by_user', (q) => q.eq('userId', user._id)).take(1000),
      ctx.db.query('follows').withIndex('by_following', (q) => q.eq('followingUserId', user._id)).take(1000),
      ctx.db.query('follows').withIndex('by_follower', (q) => q.eq('followerUserId', user._id)).take(1000),
      ctx.db.query('socialNotifications').withIndex('by_recipient_time', (q) => q.eq('recipientUserId', user._id)).take(1000),
    ]);
    const activeFollowers = followers.filter((row) => row.status === 'active').length;
    const activeFollowing = following.filter((row) => row.status === 'active').length;
    const unreadNotifications = notifications.filter((row) => !row.readAt).length;
    const completedWorkouts = workouts.filter((row) => row.completed).length;
    const features = summarizeFeatureHealth({
      hasUser: true,
      hasRealCountry: isRealCountryCode(user.countryCode),
      hasSettings: Boolean(settings),
      workoutsCount: workouts.length,
      completedWorkoutsCount: completedWorkouts,
      dailyStatsCount: dailyStats.length,
      workoutEventsCount: workoutEvents.length,
      trackingSamplesCount: trackingSamples.length,
      challengeCount: challenges.length,
      challengeMembershipCount: challengeMemberships.length,
      feedbackCount: feedbackRequests.length,
      feedbackVoteCount: feedbackVotes.length,
      followersCount: activeFollowers,
      followingCount: activeFollowing,
      unreadNotificationsCount: unreadNotifications,
      posthogConfigured: Boolean(process.env.POSTHOG_API_KEY && process.env.POSTHOG_HOST),
    });

    return {
      clientUserId,
      generatedAt: Date.now(),
      user: {
        countryCode: user.countryCode,
        countryName: user.countryName,
        totalReps: user.totalReps,
        bestReps: user.bestReps,
        proStatus: user.proStatus,
        subscriptionStatus: user.subscriptionStatus,
        deletionStatus: user.deletionStatus ?? 'active',
        updatedAt: user.updatedAt,
      },
      counts: {
        workouts: workouts.length,
        completedWorkouts,
        dailyStats: dailyStats.length,
        workoutEvents: workoutEvents.length,
        trackingSamples: trackingSamples.length,
        challenges: challenges.length,
        challengeMemberships: challengeMemberships.length,
        feedbackRequests: feedbackRequests.length,
        feedbackVotes: feedbackVotes.length,
        followers: activeFollowers,
        following: activeFollowing,
        unreadNotifications,
      },
      features,
    };
  },
});

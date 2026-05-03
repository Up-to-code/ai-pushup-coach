import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    clientUserId: v.string(),
    name: v.string(),
    displayName: v.optional(v.string()),
    nickname: v.string(),
    bio: v.optional(v.string()),
    coachTone: v.optional(v.union(v.literal('balanced'), v.literal('jokey'), v.literal('strict'))),
    personalityTags: v.optional(v.array(v.string())),
    countryCode: v.string(),
    countryName: v.string(),
    avatar: v.optional(v.string()),
    proStatus: v.union(v.literal('free'), v.literal('pro')),
    deletionStatus: v.optional(v.union(v.literal('active'), v.literal('pendingDeletion'))),
    deletedAt: v.optional(v.number()),
    deleteAfter: v.optional(v.number()),
    restoreTokenVersion: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    streak: v.number(),
    energy: v.number(),
    totalReps: v.number(),
    bestReps: v.number(),
  }).index('by_client_user_id', ['clientUserId'])
    .index('by_total_reps', ['totalReps'])
    .index('by_country_total_reps', ['countryCode', 'totalReps']),

  userSettings: defineTable({
    userId: v.id('users'),
    soundEnabled: v.boolean(),
    hapticsEnabled: v.boolean(),
    theme: v.union(v.literal('dark'), v.literal('mirror')),
    accentColor: v.string(),
    notificationsEnabled: v.optional(v.boolean()),
    workoutReminderEnabled: v.optional(v.boolean()),
    missedReminderEnabled: v.optional(v.boolean()),
    defaultWorkoutTime: v.optional(v.string()),
    defaultCameraMode: v.optional(v.union(v.literal('faceFocus'), v.literal('fullScene'))),
    updatedAt: v.number(),
  }).index('by_user_id', ['userId']),

  workoutResults: defineTable({
    clientWorkoutId: v.string(),
    userId: v.id('users'),
    date: v.number(),
    type: v.union(v.literal('open'), v.literal('timer'), v.literal('limit'), v.literal('sets')),
    trainingCameraMode: v.union(v.literal('faceFocus'), v.literal('fullScene')),
    reps: v.number(),
    duration: v.number(),
    calories: v.number(),
    completed: v.boolean(),
    goal: v.optional(v.number()),
    sets: v.optional(v.array(v.number())),
    restTime: v.optional(v.number()),
    formFeedbackState: v.optional(v.union(
      v.literal('good'),
      v.literal('tooFast'),
      v.literal('badForm'),
      v.literal('incomplete')
    )),
    cameraPresentationState: v.optional(v.union(
      v.literal('permission'),
      v.literal('preparing'),
      v.literal('tracking'),
      v.literal('manualFallback'),
      v.literal('unavailable')
    )),
    qualityScore: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_client_workout_id', ['clientWorkoutId'])
    .index('by_user_date', ['userId', 'date'])
    .index('by_user_reps', ['userId', 'reps'])
    .index('by_date', ['date']),

  workoutEvents: defineTable({
    workoutId: v.id('workoutResults'),
    userId: v.id('users'),
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
    timestamp: v.number(),
  }).index('by_workout_time', ['workoutId', 'timestamp'])
    .index('by_user_time', ['userId', 'timestamp']),

  faceTrackingSamples: defineTable({
    workoutId: v.id('workoutResults'),
    userId: v.id('users'),
    timestamp: v.number(),
    faceDetected: v.boolean(),
    faceHeight: v.number(),
    centerX: v.number(),
    centerY: v.number(),
    trackingPhase: v.optional(v.string()),
    trackingProblem: v.optional(v.string()),
    brightnessState: v.optional(v.union(v.literal('ok'), v.literal('dark'), v.literal('unknown'))),
  }).index('by_workout_time', ['workoutId', 'timestamp'])
    .index('by_user_time', ['userId', 'timestamp']),

  dailyStats: defineTable({
    userId: v.id('users'),
    dayKey: v.string(),
    reps: v.number(),
    workouts: v.number(),
    duration: v.number(),
    calories: v.number(),
    bestReps: v.number(),
    updatedAt: v.number(),
  }).index('by_user_day', ['userId', 'dayKey'])
    .index('by_day_reps', ['dayKey', 'reps']),

  follows: defineTable({
    followerUserId: v.id('users'),
    followingUserId: v.id('users'),
    status: v.union(v.literal('active'), v.literal('blocked')),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_pair', ['followerUserId', 'followingUserId'])
    .index('by_follower', ['followerUserId'])
    .index('by_following', ['followingUserId']),

  socialNotifications: defineTable({
    recipientUserId: v.id('users'),
    actorUserId: v.optional(v.id('users')),
    type: v.union(
      v.literal('followedYou'),
      v.literal('followBack'),
      v.literal('challengeJoined'),
      v.literal('challengeCompleted'),
      v.literal('friendPassedYou'),
      v.literal('workoutReminder')
    ),
    title: v.string(),
    body: v.string(),
    entityId: v.optional(v.string()),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index('by_recipient_time', ['recipientUserId', 'createdAt'])
    .index('by_recipient_read', ['recipientUserId', 'readAt']),

  challenges: defineTable({
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    goalReps: v.number(),
    windowDays: v.number(),
    visibility: v.union(v.literal('global'), v.literal('country'), v.literal('friends')),
    reward: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_slug', ['slug'])
    .index('by_visibility_ends', ['visibility', 'endsAt']),

  challengeMembers: defineTable({
    challengeId: v.id('challenges'),
    userId: v.id('users'),
    progressReps: v.number(),
    joinedAt: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index('by_challenge_user', ['challengeId', 'userId'])
    .index('by_user', ['userId'])
    .index('by_challenge_progress', ['challengeId', 'progressReps']),

  rateLimits: defineTable({
    userId: v.id('users'),
    bucket: v.string(),
    windowStart: v.number(),
    count: v.number(),
    updatedAt: v.number(),
  }).index('by_user_bucket', ['userId', 'bucket']),
});

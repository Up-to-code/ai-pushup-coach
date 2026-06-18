export type AnalyticsUser = {
  _id: string;
  clientUserId: string;
  countryCode: string;
  proStatus: 'free' | 'pro';
  subscriptionStatus?: 'free' | 'pro' | 'expired' | 'unknown';
  subscriptionProvider?: 'adapty' | 'development' | 'none';
};

export type WorkoutAnalyticsInput = {
  clientWorkoutId: string;
  type: 'open' | 'timer' | 'limit' | 'sets';
  trainingCameraMode: 'faceFocus' | 'fullScene';
  reps: number;
  duration: number;
  calories: number;
  completed: boolean;
  goal?: number;
  formFeedbackState?: 'good' | 'tooFast' | 'badForm' | 'incomplete';
  cameraPresentationState?: 'permission' | 'preparing' | 'tracking' | 'manualFallback' | 'unavailable';
  qualityScore?: number;
};

export type FeedbackAnalyticsInput = {
  kind: 'feature' | 'bug';
  status?: 'created' | 'updated';
  voteCount?: number;
};

export type SubscriptionAnalyticsInput = {
  proStatus: 'free' | 'pro';
  subscriptionStatus: 'free' | 'pro' | 'expired' | 'unknown';
  subscriptionProvider: 'adapty' | 'development' | 'none';
  activeProductIdentifier?: string;
  activeAccessLevelId?: string;
};

export function baseUserProperties(user: AnalyticsUser) {
  return {
    userId: user._id,
    clientUserId: user.clientUserId,
    countryCode: user.countryCode,
    proStatus: user.proStatus,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionProvider: user.subscriptionProvider,
  };
}

export function buildProfileCreatedProperties(user: AnalyticsUser) {
  return baseUserProperties(user);
}

export function buildWorkoutSubmittedProperties(user: AnalyticsUser, workout: WorkoutAnalyticsInput) {
  return {
    ...baseUserProperties(user),
    clientWorkoutId: workout.clientWorkoutId,
    workoutType: workout.type,
    trainingCameraMode: workout.trainingCameraMode,
    reps: workout.reps,
    duration: workout.duration,
    calories: workout.calories,
    completed: workout.completed,
    goal: workout.goal,
    formFeedbackState: workout.formFeedbackState,
    cameraPresentationState: workout.cameraPresentationState,
    qualityScore: workout.qualityScore,
  };
}

export function buildFeedbackSubmittedProperties(user: AnalyticsUser, feedback: FeedbackAnalyticsInput) {
  return {
    ...baseUserProperties(user),
    feedbackKind: feedback.kind,
    status: feedback.status ?? 'created',
  };
}

export function buildFeedbackVoteProperties(user: AnalyticsUser, feedback: FeedbackAnalyticsInput) {
  return {
    ...baseUserProperties(user),
    feedbackKind: feedback.kind,
    voted: true,
    voteCount: feedback.voteCount,
  };
}

export function buildSubscriptionUpdatedProperties(user: AnalyticsUser, subscription: SubscriptionAnalyticsInput) {
  return {
    ...baseUserProperties(user),
    proStatus: subscription.proStatus,
    subscriptionStatus: subscription.subscriptionStatus,
    subscriptionProvider: subscription.subscriptionProvider,
    activeProductIdentifier: subscription.activeProductIdentifier,
    activeAccessLevelId: subscription.activeAccessLevelId,
  };
}

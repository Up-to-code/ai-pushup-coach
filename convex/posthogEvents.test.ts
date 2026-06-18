import { describe, expect, it } from 'vitest';
import {
  buildFeedbackSubmittedProperties,
  buildFeedbackVoteProperties,
  buildSubscriptionUpdatedProperties,
  buildWorkoutSubmittedProperties,
  type AnalyticsUser,
} from './posthogEvents';

const user: AnalyticsUser = {
  _id: 'users:1',
  clientUserId: 'auth-user-1',
  countryCode: 'US',
  proStatus: 'pro',
  subscriptionStatus: 'pro',
  subscriptionProvider: 'adapty',
};

describe('PostHog event payloads', () => {
  it('builds workout submission properties without dropping workout details', () => {
    expect(
      buildWorkoutSubmittedProperties(user, {
        clientWorkoutId: 'workout-1',
        type: 'sets',
        trainingCameraMode: 'faceFocus',
        reps: 24,
        duration: 72,
        calories: 8,
        completed: true,
        goal: 30,
        formFeedbackState: 'good',
        cameraPresentationState: 'tracking',
        qualityScore: 94,
      })
    ).toMatchObject({
      clientUserId: 'auth-user-1',
      countryCode: 'US',
      proStatus: 'pro',
      clientWorkoutId: 'workout-1',
      workoutType: 'sets',
      trainingCameraMode: 'faceFocus',
      reps: 24,
      duration: 72,
      completed: true,
      qualityScore: 94,
    });
  });

  it('builds feedback and vote properties with user context', () => {
    expect(buildFeedbackSubmittedProperties(user, { kind: 'bug', status: 'created' })).toMatchObject({
      clientUserId: 'auth-user-1',
      feedbackKind: 'bug',
      status: 'created',
    });

    expect(buildFeedbackVoteProperties(user, { kind: 'feature', voteCount: 4 })).toMatchObject({
      clientUserId: 'auth-user-1',
      feedbackKind: 'feature',
      voted: true,
      voteCount: 4,
    });
  });

  it('builds subscription update properties', () => {
    expect(
      buildSubscriptionUpdatedProperties(user, {
        proStatus: 'free',
        subscriptionStatus: 'expired',
        subscriptionProvider: 'adapty',
        activeProductIdentifier: 'com.example.yearly',
        activeAccessLevelId: 'premium',
      })
    ).toMatchObject({
      clientUserId: 'auth-user-1',
      proStatus: 'free',
      subscriptionStatus: 'expired',
      subscriptionProvider: 'adapty',
      activeProductIdentifier: 'com.example.yearly',
      activeAccessLevelId: 'premium',
    });
  });
});

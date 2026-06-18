import { describe, expect, it } from 'vitest';
import { summarizeFeatureHealth, type AppHealthInput } from './appHealth';

const healthyInput: AppHealthInput = {
  hasUser: true,
  hasRealCountry: true,
  hasSettings: true,
  workoutsCount: 2,
  completedWorkoutsCount: 2,
  dailyStatsCount: 1,
  workoutEventsCount: 4,
  trackingSamplesCount: 5,
  challengeCount: 3,
  challengeMembershipCount: 1,
  feedbackCount: 1,
  feedbackVoteCount: 1,
  followersCount: 1,
  followingCount: 1,
  unreadNotificationsCount: 1,
  posthogConfigured: true,
};

describe('summarizeFeatureHealth', () => {
  it('marks all active features as pass', () => {
    expect(summarizeFeatureHealth(healthyInput).every((row) => row.status === 'pass')).toBe(true);
  });

  it('marks missing required backend identity as broken', () => {
    const rows = summarizeFeatureHealth({ ...healthyInput, hasUser: false });

    expect(rows.find((row) => row.feature === 'Auth/Profile')).toMatchObject({
      status: 'broken',
    });
  });

  it('distinguishes incomplete optional flows from broken backend setup', () => {
    const rows = summarizeFeatureHealth({
      ...healthyInput,
      hasRealCountry: false,
      workoutsCount: 0,
      completedWorkoutsCount: 0,
      challengeCount: 0,
      posthogConfigured: false,
    });

    expect(rows.find((row) => row.feature === 'Country rank')?.status).toBe('warn');
    expect(rows.find((row) => row.feature === 'Workouts')?.status).toBe('warn');
    expect(rows.find((row) => row.feature === 'Challenges')?.status).toBe('broken');
    expect(rows.find((row) => row.feature === 'Analytics')?.status).toBe('warn');
  });
});

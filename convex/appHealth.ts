export type FeatureHealthStatus = 'pass' | 'warn' | 'broken';

export type FeatureHealthRow = {
  feature: string;
  status: FeatureHealthStatus;
  detail: string;
};

export type AppHealthInput = {
  hasUser: boolean;
  hasRealCountry: boolean;
  hasSettings: boolean;
  workoutsCount: number;
  completedWorkoutsCount: number;
  dailyStatsCount: number;
  workoutEventsCount: number;
  trackingSamplesCount: number;
  challengeCount: number;
  challengeMembershipCount: number;
  feedbackCount: number;
  feedbackVoteCount: number;
  followersCount: number;
  followingCount: number;
  unreadNotificationsCount: number;
  posthogConfigured: boolean;
};

function statusForRequiredRow(hasRow: boolean): FeatureHealthStatus {
  return hasRow ? 'pass' : 'warn';
}

function statusForActivity(count: number): FeatureHealthStatus {
  return count > 0 ? 'pass' : 'warn';
}

export function summarizeFeatureHealth(input: AppHealthInput): FeatureHealthRow[] {
  return [
    {
      feature: 'Auth/Profile',
      status: input.hasUser ? 'pass' : 'broken',
      detail: input.hasUser ? 'App user exists in Convex.' : 'No app user row for this Better Auth user.',
    },
    {
      feature: 'Country rank',
      status: input.hasRealCountry ? 'pass' : 'warn',
      detail: input.hasRealCountry ? 'Profile has a real country.' : 'Profile country is GLOBAL or missing.',
    },
    {
      feature: 'Settings',
      status: statusForRequiredRow(input.hasSettings),
      detail: input.hasSettings ? 'Settings row exists.' : 'Settings have not been saved yet.',
    },
    {
      feature: 'Workouts',
      status: statusForActivity(input.workoutsCount),
      detail: `${input.workoutsCount} workout rows, ${input.completedWorkoutsCount} completed.`,
    },
    {
      feature: 'Profile stats',
      status: statusForActivity(input.dailyStatsCount),
      detail: `${input.dailyStatsCount} daily stat rows.`,
    },
    {
      feature: 'Workout telemetry',
      status: statusForActivity(input.workoutEventsCount),
      detail: `${input.workoutEventsCount} workout event rows.`,
    },
    {
      feature: 'Camera tracking',
      status: statusForActivity(input.trackingSamplesCount),
      detail: `${input.trackingSamplesCount} face tracking sample rows.`,
    },
    {
      feature: 'Challenges',
      status: input.challengeCount > 0 ? 'pass' : 'broken',
      detail: `${input.challengeCount} challenges, ${input.challengeMembershipCount} joined.`,
    },
    {
      feature: 'Feedback',
      status: statusForActivity(input.feedbackCount),
      detail: `${input.feedbackCount} requests, ${input.feedbackVoteCount} votes by user.`,
    },
    {
      feature: 'Social',
      status: input.followersCount + input.followingCount > 0 ? 'pass' : 'warn',
      detail: `${input.followersCount} followers, ${input.followingCount} following.`,
    },
    {
      feature: 'Notifications',
      status: input.unreadNotificationsCount > 0 ? 'pass' : 'warn',
      detail: `${input.unreadNotificationsCount} unread notifications.`,
    },
    {
      feature: 'Analytics',
      status: input.posthogConfigured ? 'pass' : 'warn',
      detail: input.posthogConfigured ? 'PostHog server env is configured.' : 'PostHog server env is missing.',
    },
  ];
}

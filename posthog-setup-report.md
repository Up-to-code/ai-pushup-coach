<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the AI Pushup Coach React Native app. The SDK (`posthog-react-native`) was already installed and the `PostHogProvider` with user identification was already in place in `src/analytics/AnalyticsProvider.tsx`. This integration adds 12 event captures across 7 files, covering the full user journey from sign-in through workout completion and subscription conversion. Environment variables (`EXPO_PUBLIC_POSTHOG_API_KEY` and `EXPO_PUBLIC_POSTHOG_HOST`) are set in `.env.local` and referenced via `src/analytics/config.ts`.

| Event | Description | File |
|-------|-------------|------|
| `sign_in_attempted` | User taps Apple or Google sign-in button | `app/(auth)/sign-in.tsx` |
| `sign_in_completed` | User successfully completes social sign-in | `app/(auth)/sign-in.tsx` |
| `onboarding_completed` | User finishes the initial onboarding flow and a training plan is generated | `app/(stack)/onboarding.tsx` |
| `plan_rebuilt` | Existing user rebuilds/updates their training plan | `app/(stack)/onboarding.tsx` |
| `practice_mode_selected` | User selects a workout mode (open, timer, limit, sets) | `app/(tabs)/practice.tsx` |
| `workout_started` | User taps "Start live session" on the training setup screen | `app/(stack)/training-setup.tsx` |
| `workout_completed` | User saves a completed workout session with at least one rep | `app/(stack)/workout-complete.tsx` |
| `challenge_joined` | User joins a challenge on the challenges screen | `app/(tabs)/challenges.tsx` |
| `challenge_left` | User leaves a challenge on the challenges screen | `app/(tabs)/challenges.tsx` |
| `paywall_viewed` | Paywall modal becomes visible to the user | `src/subscriptions/SubscriptionProvider.tsx` |
| `subscription_purchased` | User successfully purchases a pro subscription | `src/subscriptions/SubscriptionProvider.tsx` |
| `subscription_restored` | User successfully restores a previous pro subscription | `src/subscriptions/SubscriptionProvider.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1610144)
- [Workout Completions Over Time](/insights/GcIHfMIY) — daily count of completed workouts
- [Onboarding Conversion Funnel](/insights/RqgFBOSZ) — sign-in attempt → sign-in completed → onboarding completed
- [Paywall to Purchase Conversion](/insights/ratVYEUx) — paywall viewed → subscription purchased
- [Workout Started vs Completed](/insights/MVlcp2gQ) — daily active users starting vs finishing sessions
- [Challenge Engagement](/insights/dkS5XeFU) — daily challenge joins and leaves

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Push Counter privacy policy.',
};

export default function PrivacyPage() {
  return (
    <main className="apple-section">
      <div className="apple-doc">
        <p className="apple-eyebrow">Effective May 1, 2026</p>
        <h1 className="apple-doc-title">Privacy Policy</h1>

        <div className="apple-doc-body">
          <p>
            Push Counter helps users track push-up workouts, training plans, progress history, and optional social ranking features. This policy explains the practical data the app uses for those features.
          </p>

          <h2>Information We Use</h2>
          <ul>
            <li>Account and profile information you provide or sync through sign-in, such as user id, display name, nickname, bio, country, avatar, and coach tone.</li>
            <li>Workout information, such as reps, duration, calories, workout type, goal, sets, completion state, form feedback state, camera mode, quality score, and workout dates.</li>
            <li>Training settings, subscription status, social and leaderboard data, profile avatar images you choose, and diagnostic data needed to run app services.</li>
          </ul>

          <h2>Camera Use</h2>
          <p>
            The camera is used during live workout sessions to estimate push-up movement and count reps. The app does not need microphone audio for workout tracking, and workout video is not saved to your photo library by default.
          </p>

          <h2>Local Storage and Sync</h2>
          <p>
            The app stores core workout, profile, settings, and onboarding data locally on your device. When signed in, selected app data may sync with Convex-backed services.
          </p>

          <h2>Purchases</h2>
          <p>
            Subscription purchase, renewal, restore, cancellation, and refund flows are handled through RevenueCat and the App Store. Payment card details are handled by Apple and RevenueCat.
          </p>

          <h2>Account Deletion</h2>
          <p>
            You can initiate account deletion in Settings. Deleting the app account does not automatically cancel an active App Store subscription.
          </p>

          <h2>Your Choices</h2>
          <p>
            You can edit your profile, deny camera permission, use guest mode, manage subscriptions, delete your account, and change notification settings from the app.
          </p>
        </div>
      </div>
    </main>
  );
}

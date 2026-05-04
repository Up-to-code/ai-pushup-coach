import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Push Counter terms of use.',
};

export default function TermsPage() {
  return (
    <main className="apple-section">
      <div className="apple-doc">
        <p className="apple-eyebrow">Effective May 1, 2026</p>
        <h1 className="apple-doc-title">Terms of Use</h1>

        <div className="apple-doc-body">
          <p>
            These terms apply to your use of Push Counter, a fitness tracking app for push-up training, workout history, progress feedback, and optional social ranking features.
          </p>

          <h2>Fitness Guidance</h2>
          <p>
            Push Counter provides general fitness tracking and training guidance. It is not medical advice, diagnosis, treatment, or a substitute for a qualified health professional.
          </p>

          <h2>User Responsibility</h2>
          <p>
            You are responsible for exercising safely, using proper form, choosing appropriate training intensity, and making sure your workout space is safe. Camera-based tracking and rep counting are estimates.
          </p>

          <h2>Accounts and Guest Use</h2>
          <p>
            Some features may work locally without sign-in. Synced features, social features, leaderboards, challenges, and cross-device continuity may require sign-in and network access.
          </p>

          <h2>Subscriptions</h2>
          <p>
            Optional paid subscription features may be offered. Purchases, renewals, cancellations, and refunds are handled through the App Store and RevenueCat-supported purchase flows.
          </p>

          <h2>Social and Leaderboard Features</h2>
          <p>
            Leaderboards, country rank, friend comparison, follows, and challenges are for motivation and progress context. Do not use these features to harass, impersonate, or abuse other users.
          </p>

          <h2>Availability</h2>
          <p>
            Features may depend on device permissions, camera support, network access, backend services, subscription services, and operating system behavior.
          </p>
        </div>
      </div>
    </main>
  );
}

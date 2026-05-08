import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms of Use for Push Counter subscriptions, fitness features, accounts, and app services.',
};

export default function TermsPage() {
  return (
    <main className="apple-section">
      <div className="apple-doc">
        <p className="apple-eyebrow">Effective May 8, 2026</p>
        <h1 className="apple-doc-title">Terms of Use</h1>

        <div className="apple-doc-body">
          <p>
            These Terms of Use apply to Push Counter, including the iOS app, website, subscriptions, workout tracking, training plans, progress history, and optional social features. By using Push Counter, you agree to these terms.
          </p>

          <h2>App Provider</h2>
          <p>
            Push Counter is provided by Nexfiy. For support, contact us through the support page linked on this website or through the support options available in the app.
          </p>

          <h2>Eligibility</h2>
          <p>
            You may use Push Counter only if you can form a binding agreement and comply with these terms. If you use the app on behalf of another person or organization, you are responsible for making sure that use is authorized.
          </p>

          <h2>Fitness Guidance</h2>
          <p>
            Push Counter provides general fitness tracking, training guidance, and motivational tools. It is not medical advice, diagnosis, treatment, or a substitute for a qualified health professional. Stop exercising if you feel pain, dizziness, shortness of breath, or any other concerning symptom, and seek medical advice when appropriate.
          </p>

          <h2>Safe Use</h2>
          <p>
            You are responsible for exercising safely, using proper form, choosing appropriate training intensity, and making sure your workout space is safe. Camera-based tracking, rep counting, calories, form feedback, and progress estimates may be inaccurate and should not be treated as guaranteed measurements.
          </p>

          <h2>Accounts</h2>
          <p>
            Account features may require sign-in, network access, and accurate profile information. You are responsible for activity under your account and for keeping your sign-in method secure. Social features, leaderboards, challenges, subscriptions, and cross-device continuity may be unavailable if you are not signed in.
          </p>

          <h2>Subscriptions</h2>
          <p>
            Push Counter may offer optional auto-renewable subscriptions. Subscription titles, lengths, prices, billing periods, free trials, and renewal terms are shown in the purchase flow before purchase. Eligible new subscribers may receive a 3-day free trial before the Yearly Pro subscription renews at the displayed yearly price. Monthly Pro does not include a free trial unless the purchase flow states otherwise.
          </p>
          <p>
            Payment is charged to your Apple Account at confirmation of purchase. Subscriptions renew automatically unless canceled at least 24 hours before the end of the current period. Your Apple Account may be charged for renewal within 24 hours before the end of the current period. You can manage or cancel subscriptions in your Apple Account settings. Deleting the app or deleting an app account does not cancel an active App Store subscription.
          </p>
          <p>
            Purchases, renewals, cancellations, billing, and refunds are handled by Apple through the App Store. We do not receive or store your full payment card details.
          </p>

          <h2>Social and Leaderboard Features</h2>
          <p>
            Leaderboards, country rank, friend comparison, follows, and challenges are for motivation and progress context. Do not use Push Counter to harass, impersonate, threaten, abuse, or mislead other users. We may restrict access to social features if we believe they are being misused.
          </p>

          <h2>User Content</h2>
          <p>
            If you upload or enter profile details, images, names, bios, workout information, or other content, you are responsible for that content. You grant us permission to process and display that content as needed to provide the app features you choose to use.
          </p>

          <h2>Privacy</h2>
          <p>
            Our Privacy Policy explains how Push Counter uses information for account, workout, subscription, camera, profile, and support features. The Privacy Policy is available at https://www.pushcounter.online/privacy.
          </p>

          <h2>Acceptable Use</h2>
          <p>
            You may not interfere with the app, attempt to access systems without authorization, abuse purchase flows, scrape services, reverse engineer the app except where law allows, or use Push Counter in a way that violates applicable law or these terms.
          </p>

          <h2>Availability</h2>
          <p>
            Features may depend on device permissions, camera support, network access, backend services, subscription services, and operating system behavior.
          </p>

          <h2>Changes</h2>
          <p>
            We may update Push Counter or these terms from time to time. If changes are material, we will take reasonable steps to make the updated terms available. Continued use of Push Counter after changes means you accept the updated terms.
          </p>

          <h2>Disclaimer</h2>
          <p>
            Push Counter is provided on an as-is and as-available basis. To the extent allowed by law, we disclaim warranties of accuracy, fitness for a particular purpose, uninterrupted availability, and error-free operation.
          </p>

          <h2>Limitation of Liability</h2>
          <p>
            To the extent allowed by law, Nexfiy is not liable for indirect, incidental, special, consequential, or punitive damages, or for losses related to exercise decisions, data loss, service interruption, or inaccurate estimates.
          </p>

          <h2>Contact</h2>
          <p>
            For questions about these terms, use the Support page on this website.
          </p>
        </div>
      </div>
    </main>
  );
}

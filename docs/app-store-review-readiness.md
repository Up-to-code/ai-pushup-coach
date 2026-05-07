# App Store Review Readiness

Last reviewed: May 2, 2026

Official references:

- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Account deletion guidance: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Auto-renewable subscriptions: https://developer.apple.com/app-store/subscriptions/

## In-App Review Risks Covered

- Account deletion: Settings includes a destructive "Delete account and data" flow for signed-in users and "Clear local data" for guest users.
- Sign-in access: The sign-in screen includes Continue with Apple and Continue without sign in.
- Purchase recovery: Settings includes Restore purchases and Manage subscription.
- Privacy access: Settings links to Camera and workout data, Privacy Policy, Terms of Use, and the public Push Counter website.
- Camera purpose: The iOS camera permission string explains live workout rep tracking and states that workout video is not saved to the photo library.
- Photo purpose: Photo library permission copy is limited to choosing a profile picture.

## App Store Connect Privacy Label Draft

Declare data collected by the app and third-party SDKs if it is transmitted off-device and retained beyond servicing the request.

- Contact Info: email address may be processed by Better Auth sign-in.
- User ID: Better Auth user id, Convex client user id, Adapty app user id.
- Fitness: workout reps, duration, calories, workout dates, goals, sets, form feedback, camera tracking state, quality score.
- User Content: profile display name, nickname, bio, country, avatar image, social links if provided.
- Photos or Videos: selected profile avatar image only.
- Purchases: subscription status and purchase history through Adapty/App Store.
- Usage Data: product interaction and social/challenge/leaderboard activity if synced.
- Diagnostics: crash, performance, network, and service diagnostics collected by integrated services.

Recommended purposes:

- App Functionality: authentication, sync, workout history, profile, leaderboard, social, subscriptions, notifications.
- Product Personalization: training plan, coach tone, progress surfaces.
- Analytics: only declare if production services retain analytics or diagnostic usage beyond real-time operation.

Tracking:

- Do not mark tracking unless data is linked with third-party data for advertising or shared with a data broker. The current app has no advertising SDK in `package.json`.

## Review Notes To Provide

- A reviewer can use Continue without sign in for local workout flows.
- Signed-in social, leaderboard, and cross-device sync features require Apple sign-in.
- Camera permission is requested when entering camera workout flows; manual fallback remains available if camera access is denied.
- Account deletion is available from Settings > Data control.
- Restore purchases and Manage subscription are available from Settings > Subscription.
- Payment card details are handled by Apple/Adapty; the app only receives entitlement and purchase status.

## Before Submission

- Use production Better Auth, Convex, Adapty, and UploadThing credentials.
- Verify Adapty offerings and App Store Connect products are ready for review and visible in the review build.
- Upload current Privacy Policy and Terms URLs from the Push Counter website in App Store Connect.
- Submit any in-app purchases/subscriptions with the app build if they are new.
- Use a compatible Xcode for Expo SDK 51 or upgrade Expo SDK before final archive.

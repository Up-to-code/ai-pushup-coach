# App Store Connect Draft

## App Information

- Name: Push Counter
- Bundle ID: com.pushcounter.app
- SKU: push-counter-ios
- Primary category: Health & Fitness
- Secondary category: Sports
- Content rights: The app does not contain, show, or access third-party copyrighted content as a primary feature.
- Age rating basis: Fitness guidance, no medical diagnosis, no objectionable content.

## Product Page Metadata

Subtitle:

Push-up counter and planner

Promotional text:

Train toward stronger push-ups with guided plans, live rep tracking, reminders, and progress history.

Description:

Push Counter helps you build a consistent push-up routine with simple planning, live workout tracking, and progress feedback.

Create a plan around your current level, training days, and goals. During workouts, use camera-based rep tracking when available or continue manually when camera access is denied or unavailable. Your profile shows workout history, streaks, best sessions, weekly progress, and recent activity.

Signed-in users can sync selected profile and workout data, join challenges, compare leaderboard progress, follow other athletes, and restore Pro access across devices. Guest mode keeps core training flows available without sign-in.

The app is fitness guidance, not medical advice. Stop exercising if you feel pain, dizziness, shortness of breath, or unsafe symptoms.

Keywords:

pushup,push-up,push ups,fitness,workout,calisthenics,rep counter,training,home workout,exercise

Support URL:

https://nexfiy.com/apps/push-counter

Privacy Policy URL:

https://nexfiy.com/apps/push-counter/privacy

Terms of Use URL:

https://nexfiy.com/apps/push-counter/terms

## Review Notes

Push Counter can be reviewed without creating an account by selecting "Continue without sign in" on the sign-in screen. Guest mode supports onboarding, local planning, workout sessions, settings, legal screens, and local workout history.

Apple and Google sign-in are provided for account sync, social features, challenges, leaderboards, and cross-device continuity. Apple sign-in is available wherever third-party sign-in is offered.

Camera permission is requested when entering camera workout flows. The camera is used to estimate push-up movement and count reps during live workouts. Workout video is not saved to the user's photo library by default. Manual fallback states are available when camera access is denied or unavailable.

Account deletion is available from Settings > Data control > Delete account and data for signed-in users. Guest users can clear local data from the same section. Deleting the app account does not cancel an App Store subscription.

Restore purchases and Manage subscription are available from Settings > Subscription. Payment card details are handled by Apple and RevenueCat; the app receives entitlement and purchase status.

## Subscription and IAP Reminders

- Submit any new subscriptions or in-app purchases with the app build.
- Ensure RevenueCat offerings are configured and visible in the review build.
- Ensure App Store Connect subscription products have completed names, descriptions, prices, durations, screenshots, and review information.
- Ensure the paywall shows the product, price, duration, renewal behavior, privacy policy link, and terms link before purchase.
- Ensure Restore purchases works for reviewers.
- Use the same entitlement identifier expected by the app: `pushup-coach Pro` unless the production environment overrides it.

## Pre-Submission Checks

- Use production Clerk, Convex, RevenueCat, and UploadThing credentials.
- Confirm the privacy policy URL loads publicly without authentication.
- Confirm the support URL loads publicly and provides a contact path.
- Confirm account deletion works with a test signed-in account.
- Confirm camera permission copy matches the app behavior.
- Use a compatible Xcode for Expo SDK 51 or upgrade Expo SDK before final archive.

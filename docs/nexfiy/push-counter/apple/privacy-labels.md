# App Store Privacy Labels Draft

Use this draft in App Store Connect. Keep it aligned with the public Privacy Policy and the production SDK configuration.

Official reference: https://developer.apple.com/app-store/app-privacy-details/

## Tracking

Tracking: No

Rationale: The current app has no advertising SDK in `package.json` and should not link app data with third-party data for targeted advertising or share app data with a data broker. Change this only if an advertising, attribution, or tracking SDK is added later.

## Data Linked To The User

### Contact Info

- Email Address
- Purpose: App Functionality
- Source: Clerk sign-in provider data when a user signs in.

### Identifiers

- User ID
- Purpose: App Functionality
- Source: Clerk user id, Convex client user id, RevenueCat app user id.

### Health & Fitness

- Fitness
- Purpose: App Functionality, Product Personalization
- Source: Workout reps, duration, calories, dates, goals, sets, camera tracking state, form feedback, and quality score.

### User Content

- Photos or Videos
- Purpose: App Functionality
- Source: Profile avatar only when the user selects an image from their photo library.

- Other User Content
- Purpose: App Functionality, Product Personalization
- Source: Display name, nickname, bio, country, coach tone, social links, follows, challenges, leaderboard context, and notifications.

### Purchases

- Purchase History
- Purpose: App Functionality
- Source: RevenueCat and App Store subscription status and entitlement history.

### Usage Data

- Product Interaction
- Purpose: App Functionality, Product Personalization
- Source: Synced workout, challenge, leaderboard, and social interaction records.

### Diagnostics

- Crash Data
- Performance Data
- Other Diagnostic Data
- Purpose: App Functionality
- Source: Integrated services and app diagnostics used to troubleshoot sync, purchases, and runtime reliability.

## Data Not Collected By The App

- Payment card number or bank account details are handled by Apple and are not collected by Push Counter.
- Microphone audio is not used for workout tracking.
- Workout video is not saved to the photo library by default.
- Contacts are not uploaded.
- Precise location is not required for core app functionality.

## Important App Store Connect Notes

- If production analytics retains event data beyond real-time service operation, declare Analytics as a purpose for the relevant Usage Data and Diagnostics categories.
- If a new SDK is added, review that SDK's privacy manifest and update these answers.
- If advertising, attribution, or retargeting is added, revisit Tracking before submission.

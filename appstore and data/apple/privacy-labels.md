# Push Counter App Store Privacy Labels Draft

Use this draft in App Store Connect. Keep it aligned with the public Privacy Policy and the production SDK configuration.

Apple reference: https://developer.apple.com/app-store/app-privacy-details/

## Tracking

Tracking: No

Rationale: The current app does not include an advertising SDK and should not link app data with third-party data for targeted advertising or share app data with a data broker. Revisit this answer if advertising, attribution, retargeting, or data broker sharing is added.

## Data Linked To The User

### Contact Info

- Email Address
- Purpose: App Functionality
- Source: Sign-in provider data when a user signs in.

### Identifiers

- User ID
- Purpose: App Functionality
- Source: Account user id, backend client user id, and purchase entitlement user id.

### Health & Fitness

- Fitness
- Purpose: App Functionality, Product Personalization
- Source: Workout reps, duration, estimated calories, dates, goals, sets, camera tracking state, form feedback, quality score, streaks, and workout history.

### User Content

- Photos or Videos
- Purpose: App Functionality
- Source: Profile avatar only when the user selects an image from the photo library.

- Other User Content
- Purpose: App Functionality, Product Personalization
- Source: Display name, nickname, bio, country, social links, follows, challenges, leaderboard context, and notifications.

### Purchases

- Purchase History
- Purpose: App Functionality
- Source: Adapty and App Store subscription status and entitlement history.

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

- Full payment card number or bank account details are handled by Apple and are not collected by Push Counter.
- Microphone audio is not used for workout tracking.
- Workout video is not saved to the photo library by default.
- Contacts are not uploaded.
- Precise location is not required for core app functionality.

## Important App Store Connect Notes

- If production analytics retains event data beyond real-time service operation, declare Analytics as a purpose for the relevant Usage Data and Diagnostics categories.
- If a new SDK is added, review that SDK's privacy manifest and update these answers.
- If advertising, attribution, retargeting, or data broker sharing is added, revisit Tracking before submission.

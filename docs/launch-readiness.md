# Launch Readiness

This checklist captures the practical v1 launch path for the iOS build of AI Push-Up Coach.

## Verified Configuration

- App name: `AI Push-Up Coach`
- Bundle identifier: `com.aipushupcoach.app`
- Apple team id: `U7JF269T76`
- Orientation: portrait
- UI style: dark
- Scheme: `aipushupcoach`
- iOS permissions include camera usage text for live workout tracking.
- Expo plugins include router, notifications, and secure store.
- Required app assets are present for icon and splash.

## Automated Checks

Run these before handing a build to a tester:

```sh
npm run check
xcodebuild -workspace ios/AIPushUpCoach.xcworkspace -scheme AIPushUpCoach -configuration Debug -destination 'generic/platform=iOS' -derivedDataPath ios/build/device-derived-data -allowProvisioningUpdates build
```

## Real-Device Launch

Use the existing device helper:

```sh
npm run ios:device
```

The script detects a paired physical iPhone, starts Metro on port 8081 if needed, builds the Debug app, installs it, and launches `com.aipushupcoach.app`.

For physical devices, the script also waits for Metro to report `packager-status:running` and temporarily forces the Debug build to embed `main.jsbundle`. This prevents the app from crashing with "No bundle URL present" when the iPhone cannot reach the Mac's Metro host during startup.

## Manual Smoke Checklist

- Fresh launch reaches the expected auth or onboarding state.
- Auth gating sends signed-out users to sign in and signed-in users into the app.
- Setup flow works across level, days, goal, and time.
- Tabs render without blank screens: home, practice, challenges, leaderboard, profile.
- Camera workout flow requests camera permission only when entering the workout experience.
- Workout session can start, render the counter, and exit safely.
- Completion flow records a workout and does not corrupt local state.
- Settings, edit profile, badges, notifications, and legal screens open without crashes.
- RevenueCat subscription screens handle loading, unavailable config, and network failure without blocking the rest of the app.
- Convex-backed social, challenge, leaderboard, profile, and workout data show usable loading, empty, and error states.

## Remaining Release Risks

- App Store metadata, screenshots, TestFlight setup, and final legal copy are not covered by this practical v1 pass.
- RevenueCat and Convex production credentials must be verified in the target release environment.
- Camera-based rep counting quality still needs physical workout QA beyond install and launch validation.

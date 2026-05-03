# Push Counter Nexfiy Bundle

Target page: https://pushcounter.online

This folder contains the copy, App Store review material, legal pages, and assets needed to publish Push Counter on Nexfiy and fill App Store Connect. The existing Vitality page is only a structure reference; all copy here is for Push Counter.

## Folder Map

- `web/page-copy.md`: Nexfiy app page copy.
- `apple/app-store-connect.md`: App Store Connect metadata, review notes, and subscription reminders.
- `apple/privacy-labels.md`: App privacy label draft.
- `legal/privacy.md`: Public privacy policy page copy.
- `legal/terms.md`: Public terms page copy.
- `assets/`: App icon, splash, favicon, logo, and current web/app imagery.
- `assets/manifest.md`: Source, dimensions, and usage notes for every copied asset.

## Upload Checklist

- Publish the app page at `https://pushcounter.online`.
- Add links on the page for Privacy Policy, Terms of Use, Support, Apple Legal, and Google Legal.
- Upload `assets/icon.png` as the main app icon unless the website has a separate icon pipeline.
- Use `assets/home_bg.png`, `assets/onboarding_camera.png`, and `assets/onboarding_compete.png` for page visuals or screenshot sections.
- Put the Privacy Policy URL and Support URL into App Store Connect before submission.
- Keep the App Store privacy label answers aligned with `apple/privacy-labels.md`.
- Confirm production Better Auth, Convex, RevenueCat, and UploadThing credentials before archive.
- Better Auth requires `EXPO_PUBLIC_CONVEX_SITE_URL` in the Expo environment and `BETTER_AUTH_SECRET`, `SITE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, and optional `APPLE_APP_BUNDLE_IDENTIFIER` in the Convex environment.
- Generate `APPLE_CLIENT_SECRET` from the Apple `.p8` key before deploy: `node scripts/generate-apple-client-secret.mjs <APPLE_CLIENT_ID> <APPLE_TEAM_ID> <APPLE_KEY_ID> AuthKey_XXXX.p8`.

## Official Apple References

- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Account deletion guidance: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Auto-renewable subscriptions: https://developer.apple.com/app-store/subscriptions/
- App Store marketing guidelines: https://developer.apple.com/app-store/marketing/guidelines/
- App icon guidance: https://developer.apple.com/design/human-interface-guidelines/app-icons/

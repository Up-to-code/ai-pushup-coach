# Asset Manifest

These files were copied from the app repo into this bundle so the Nexfiy page and App Store preparation folder can be uploaded as a self-contained package.

## Files

| Bundle file | Source path | Dimensions | Detected format | Purpose |
| --- | --- | --- | --- | --- |
| `icon.png` | `assets/icon.png` | 1024 x 1024 | PNG | Main app icon and App Store icon source. |
| `adaptive-icon.png` | `assets/adaptive-icon.png` | 1024 x 1024 | PNG | Android adaptive foreground and backup app icon source. |
| `favicon.png` | `assets/favicon.png` | 48 x 48 | PNG | Website favicon. |
| `splash-icon.png` | `assets/splash-icon.png` | 1024 x 1024 | PNG | Splash/logo artwork source. |
| `logo-push-up.png` | `assets/brand/logo-push-up.png` | 1024 x 1024 | PNG | Brand logo for website page sections. |
| `home_bg.png` | `assets/images/home_bg.png` | 1024 x 1024 | PNG | Home or hero visual. |
| `onboarding_camera.png` | `assets/images/onboarding_camera.png` | 1024 x 1024 | PNG | Camera feature visual. |
| `onboarding_compete.png` | `assets/images/onboarding_compete.png` | 1024 x 1024 | PNG | Challenges/competition feature visual. |

## Upload Guidance

- Use `icon.png` for the app card/icon on Nexfiy.
- Use `favicon.png` only for small browser favicon contexts.
- Use `home_bg.png`, `onboarding_camera.png`, and `onboarding_compete.png` as website visuals or screenshot placeholders.
- Keep the Apple App Store badge from Apple's official marketing tools rather than recreating it from app assets.
- The three source files under `assets/images/` were JPEG-encoded despite their `.png` names; the copied bundle versions were normalized to PNG for upload consistency.

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT_DIR/ios"
BUNDLE_ID="${IOS_BUNDLE_ID:-com.aipushupcoach.app}"
DEVICE_ID="${IOS_DEVICE_ID:-}"
DERIVED_DATA_PATH="$IOS_DIR/build/device-derived-data"

run_devicectl() {
  local output status

  set +e
  output="$("$@" 2>&1)"
  status=$?
  set -e

  printf '%s\n' "$output" | sed \
    -e '/^Failed to load provisioning paramter list due to error:/d' \
    -e '/^`devicectl manage create` may support a reduced set of arguments\.$/d'

  return "$status"
}

if [[ -z "$DEVICE_ID" ]]; then
  DEVICES_JSON="$(mktemp)"
  trap 'rm -f "$DEVICES_JSON"' EXIT
  run_devicectl xcrun devicectl list devices --json-output "$DEVICES_JSON" --quiet >/dev/null
  DEVICE_ID="$(
    node -e "
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
      const device = data.result.devices.find((candidate) =>
        candidate.hardwareProperties?.reality === 'physical' &&
        candidate.connectionProperties?.pairingState === 'paired'
      );
      if (device) process.stdout.write(device.identifier);
    " "$DEVICES_JSON"
  )"
fi

if [[ -z "$DEVICE_ID" ]]; then
  echo "No paired physical iPhone found. Unlock the iPhone, connect it, and trust this Mac."
  exit 1
fi

if ! lsof -nP -iTCP:8081 -sTCP:LISTEN >/dev/null 2>&1; then
  (cd "$ROOT_DIR" && npx expo start --dev-client >/tmp/ai-pushup-coach-metro.log 2>&1 &)
  echo "Started Metro on port 8081. Logs: /tmp/ai-pushup-coach-metro.log"
fi

cd "$IOS_DIR"
xcodebuild \
  -workspace AIPushUpCoach.xcworkspace \
  -scheme AIPushUpCoach \
  -configuration Debug \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  -allowProvisioningUpdates \
  build

APP_PATH="$DERIVED_DATA_PATH/Build/Products/Debug-iphoneos/AIPushUpCoach.app"

if [[ ! -d "$APP_PATH" ]]; then
  echo "Built app was not found in DerivedData."
  exit 1
fi

run_devicectl xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"
run_devicectl xcrun devicectl device process launch --device "$DEVICE_ID" "$BUNDLE_ID"

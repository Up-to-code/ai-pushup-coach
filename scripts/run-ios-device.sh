#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT_DIR/ios"
BUNDLE_ID="${IOS_BUNDLE_ID:-com.aipushupcoach.app}"
DEVICE_ID="${IOS_DEVICE_ID:-}"
METRO_PORT="${METRO_PORT:-8081}"
MAC_LAN_IP="${MAC_LAN_IP:-$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)}"
DERIVED_DATA_PATH="$IOS_DIR/build/device-derived-data"
XCODE_ENV_UPDATES="$IOS_DIR/.xcode.env.updates"
XCODE_ENV_BACKUP=""
STARTED_METRO_PID=""

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

cleanup_xcode_env_updates() {
  if [[ -n "$XCODE_ENV_BACKUP" && -f "$XCODE_ENV_BACKUP" ]]; then
    mv "$XCODE_ENV_BACKUP" "$XCODE_ENV_UPDATES"
  elif [[ -n "$XCODE_ENV_BACKUP" ]]; then
    rm -f "$XCODE_ENV_UPDATES"
  fi
}

if [[ -z "$MAC_LAN_IP" ]]; then
  echo "Could not find this Mac's LAN IP. Set MAC_LAN_IP manually, for example: MAC_LAN_IP=192.168.1.75 npm run ios:device"
  exit 1
fi

if ! lsof -nP -iTCP:"$METRO_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  (cd "$ROOT_DIR" && npx expo start --dev-client --host lan --port "$METRO_PORT") &
  STARTED_METRO_PID="$!"
  echo "Started Metro on port $METRO_PORT."
fi

for attempt in {1..30}; do
  if curl -fsS "http://localhost:$METRO_PORT/status" | grep -q "packager-status:running"; then
    break
  fi

  if [[ "$attempt" -eq 30 ]]; then
    echo "Metro did not become ready on port $METRO_PORT. Check /tmp/ai-pushup-coach-metro.log."
    exit 1
  fi

  sleep 1
done

if [[ -f "$XCODE_ENV_UPDATES" ]]; then
  XCODE_ENV_BACKUP="$(mktemp)"
  cp "$XCODE_ENV_UPDATES" "$XCODE_ENV_BACKUP"
else
  XCODE_ENV_BACKUP="$(mktemp)"
  rm -f "$XCODE_ENV_BACKUP"
fi

trap cleanup_xcode_env_updates EXIT

cat > "$XCODE_ENV_UPDATES" <<'EOF'
unset SKIP_BUNDLING
export FORCE_BUNDLING=1
EOF

"$ROOT_DIR/scripts/generate-ios-codegen.sh"

cd "$IOS_DIR"
xcodebuild \
  -workspace PushCounter.xcworkspace \
  -scheme PushCounter \
  -configuration Debug \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  -allowProvisioningUpdates \
  build

APP_PATH="$DERIVED_DATA_PATH/Build/Products/Debug-iphoneos/PushCounter.app"

if [[ ! -d "$APP_PATH" ]]; then
  echo "Built app was not found in DerivedData."
  exit 1
fi

run_devicectl xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"

DEV_SERVER_URL="http://$MAC_LAN_IP:$METRO_PORT"
PAYLOAD_URL="$(node -e "process.stdout.write('com.aipushupcoach.app://expo-development-client/?url=' + encodeURIComponent(process.argv[1]))" "$DEV_SERVER_URL")"

set +e
LAUNCH_OUTPUT="$(run_devicectl xcrun devicectl device process launch --device "$DEVICE_ID" --terminate-existing --payload-url "$PAYLOAD_URL" "$BUNDLE_ID" 2>&1)"
LAUNCH_STATUS=$?
set -e

printf '%s\n' "$LAUNCH_OUTPUT"
echo "Launched $BUNDLE_ID on device $DEVICE_ID with $DEV_SERVER_URL"

if [[ -n "$STARTED_METRO_PID" ]]; then
  echo "Metro is still running for the app. Press Ctrl+C when you are done."
  wait "$STARTED_METRO_PID"
fi

if [[ "$LAUNCH_STATUS" -ne 0 ]]; then
  if printf '%s\n' "$LAUNCH_OUTPUT" | grep -Eiq 'device was not.*unlocked|could not be unlocked|BSErrorCodeDescription = Locked'; then
    echo "The app was installed, but the iPhone is locked. Unlock the device and rerun npm run ios:device to launch it."
  fi
  exit "$LAUNCH_STATUS"
fi

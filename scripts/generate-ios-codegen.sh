#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REACT_NATIVE_DIR="$ROOT_DIR/node_modules/react-native"
OUTPUT_DIR="$ROOT_DIR/ios"
LOG_FILE="${TMPDIR:-/tmp}/ai-pushup-coach-react-codegen.log"
DERIVED_DIR="${TMPDIR:-/tmp}/ai-pushup-coach-react-codegen-derived"

if [[ ! -d "$REACT_NATIVE_DIR" ]]; then
  echo "React Native was not found in node_modules. Run npm install first."
  exit 1
fi

if [[ ! -d "$OUTPUT_DIR" ]]; then
  echo "The ios directory was not found. Run npx expo prebuild --platform ios first."
  exit 1
fi

export RCT_SCRIPT_RN_DIR="$REACT_NATIVE_DIR"
export RCT_SCRIPT_APP_PATH="$ROOT_DIR"
export RCT_SCRIPT_OUTPUT_DIR="$OUTPUT_DIR"
export RCT_SCRIPT_TYPE="withCodegenDiscovery"
export SCRIPT_OUTPUT_FILE_0="$LOG_FILE"
export DERIVED_FILE_DIR="$DERIVED_DIR"

/bin/sh -c "\"$REACT_NATIVE_DIR/scripts/xcode/with-environment.sh\" \"$REACT_NATIVE_DIR/scripts/react_native_pods_utils/script_phases.sh\""

required_files=(
  "$OUTPUT_DIR/build/generated/ios/ReactCodegen/rnasyncstorage/rnasyncstorage-generated.mm"
  "$OUTPUT_DIR/build/generated/ios/ReactCodegen/rnreanimated/rnreanimated-generated.mm"
  "$OUTPUT_DIR/build/generated/ios/ReactCodegen/rnscreens/rnscreens-generated.mm"
  "$OUTPUT_DIR/build/generated/ios/ReactCodegen/rnsvg/rnsvg-generated.mm"
  "$OUTPUT_DIR/build/generated/ios/ReactCodegen/rnworklets/rnworklets-generated.mm"
  "$OUTPUT_DIR/build/generated/ios/ReactCodegen/safeareacontext/safeareacontext-generated.mm"
  "$OUTPUT_DIR/build/generated/ios/ReactCodegen/RNDateTimePickerCGen/RNDateTimePickerCGen-generated.mm"
  "$OUTPUT_DIR/build/generated/ios/ReactCodegen/react/renderer/components/RNDateTimePickerCGen/ComponentDescriptors.cpp"
  "$OUTPUT_DIR/build/generated/ios/ReactCodegen/react/renderer/components/rnsvg/States.cpp"
  "$OUTPUT_DIR/build/generated/ios/ReactAppDependencyProvider/RCTAppDependencyProvider.mm"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "React Native codegen did not create expected file: $file"
    echo "Codegen log: $LOG_FILE"
    exit 1
  fi
done

echo "React Native iOS codegen is ready."

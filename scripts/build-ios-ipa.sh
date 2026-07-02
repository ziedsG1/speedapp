#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT_DIR/ios"
LOG_FILE="${RUNNER_TEMP:-/tmp}/xcodebuild.log"

if [ ! -d "$IOS_DIR" ]; then
  echo "ios/ folder not found. Run expo prebuild first."
  exit 1
fi

cd "$IOS_DIR"

WORKSPACE=$(find . -maxdepth 1 -name "*.xcworkspace" | head -1 || true)
if [ -z "$WORKSPACE" ]; then
  echo "No .xcworkspace found in ios/"
  ls -la
  exit 1
fi

SCHEME=$(basename "$WORKSPACE" .xcworkspace)

echo "=== Xcode workspace: $WORKSPACE ==="
echo "=== Using scheme: $SCHEME ==="
xcodebuild -workspace "$WORKSPACE" -list

DERIVED="${RUNNER_TEMP:-/tmp}/DerivedData"
rm -rf "$DERIVED"
mkdir -p "$DERIVED"

xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -sdk iphoneos \
  -derivedDataPath "$DERIVED" \
  build \
  CODE_SIGN_IDENTITY="-" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  DEVELOPMENT_TEAM="" \
  AD_HOC_CODE_SIGNING_ALLOWED=YES \
  ONLY_ACTIVE_ARCH=NO \
  COMPILER_INDEX_STORE_ENABLE=NO \
  2>&1 | tee "$LOG_FILE"

PRODUCTS="$DERIVED/Build/Products/Release-iphoneos"
APP_PATH="$PRODUCTS/${SCHEME}.app"
if [ ! -d "$APP_PATH" ]; then
  APP_PATH=$(find "$PRODUCTS" -maxdepth 1 -type d -name "*.app" | head -1 || true)
fi

if [ -z "$APP_PATH" ] || [ ! -d "$APP_PATH" ]; then
  echo "Could not find .app bundle"
  find "$DERIVED/Build/Products" -type d -name "*.app" || true
  exit 1
fi

echo "=== App bundle: $APP_PATH ==="
ls -la "$APP_PATH"

PAYLOAD_DIR="${RUNNER_TEMP:-/tmp}/Payload"
IPA_PATH="${RUNNER_TEMP:-/tmp}/SpeedApp-unsigned.ipa"

rm -rf "$PAYLOAD_DIR" "$IPA_PATH"
mkdir -p "$PAYLOAD_DIR"
cp -R "$APP_PATH" "$PAYLOAD_DIR/"

cd "$(dirname "$PAYLOAD_DIR")"
zip -qr "$IPA_PATH" Payload
ls -lh "$IPA_PATH"
echo "IPA_PATH=$IPA_PATH"

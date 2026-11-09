#!/usr/bin/env bash
# Builds an installable Android APK on this machine with Gradle: no Expo account, no cloud build.
#
#   ./scripts/build-apk-local.sh https://central.admincong.online
#
# Needs: JDK 17, a Linux Node (>= 20), and the Android SDK (platform 35 + build-tools 35).
# Defaults assume the SDK in ~/android-sdk and Node in ~/node/bin; override with ANDROID_HOME / PATH.
# The build runs in a COPY of the project (~/apk-build/app) so your node_modules and this repo stay untouched.
# Optional env: ABIS (default arm64-v8a; use "arm64-v8a,armeabi-v7a,x86_64" for emulators / old phones),
#               OUT_DIR (default ~/apk-build/out).
# The APK is signed with the debug key unless you configure your own keystore: fine to install, not for Play Store.
set -euo pipefail

URL="${1:-}"
[[ "$URL" =~ ^https?://[A-Za-z0-9._-]+(:[0-9]+)?$ ]] || {
  echo "Uso: $0 https://tu-servidor[:puerto]   (sin barra final ni ruta)" >&2; exit 1; }

SRC="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$HOME/apk-build"; WORK="$ROOT/app"; OUT_DIR="${OUT_DIR:-$ROOT/out}"
ABIS="${ABIS:-arm64-v8a}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export PATH="$HOME/node/bin:$PATH"
[ -d "$ANDROID_HOME/platforms/android-35" ] || { echo "Falta el SDK de Android en $ANDROID_HOME (platforms;android-35)." >&2; exit 1; }
command -v java >/dev/null || { echo "Falta Java 17 (sudo apt install openjdk-17-jdk)." >&2; exit 1; }
command -v node >/dev/null && [ "$(node -p 'process.platform')" = "linux" ] || { echo "Falta Node de Linux (no el de Windows)." >&2; exit 1; }
export JAVA_HOME="${JAVA_HOME:-$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")}"

echo "==> Copiando el proyecto a $WORK"
mkdir -p "$WORK" "$OUT_DIR"
tar -C "$SRC" --exclude=node_modules --exclude=.git --exclude=android --exclude=ios --exclude='.export*' \
    --exclude=.expo --exclude=.env -cf - . | tar -C "$WORK" -xf -
cd "$WORK"

echo "==> npm ci"
npm ci --no-audit --no-fund

echo "==> expo prebuild (genera android/, sin cuenta de Expo)"
rm -rf android
CI=1 npx expo prebuild --platform android --no-install

echo "==> gradle assembleRelease  (backend: $URL, ABIs: $ABIS)"
cd android
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > local.properties
export EXPO_PUBLIC_API_URL="$URL"
./gradlew assembleRelease --no-daemon "-PreactNativeArchitectures=$ABIS"

APK="$(ls app/build/outputs/apk/release/*.apk | head -1)"
DEST="$OUT_DIR/asignaciones-$(date +%Y%m%d-%H%M).apk"
cp "$APK" "$DEST"
echo
echo "Listo: $DEST ($(du -h "$DEST" | cut -f1))"
echo "Cópialo al teléfono, p. ej.: cp \"$DEST\" /mnt/c/Users/<tu-usuario>/Downloads/"

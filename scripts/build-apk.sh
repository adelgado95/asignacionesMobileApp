#!/usr/bin/env bash
# Builds an installable Android APK with your backend URL baked in (EAS Build, in the cloud).
#
#   ./scripts/build-apk.sh https://api.midominio.com
#   ./scripts/build-apk.sh http://203.0.113.10:8000          # plain http works too (cleartext is enabled in app.json)
#   ./scripts/build-apk.sh <url> --dry-run                    # show what would be built, build nothing
#   ./scripts/build-apk.sh <url> --local                      # build on this machine (needs JDK 17 + Android SDK)
#
# Needs an Expo account: run `npx eas-cli login` once. The URL goes into EXPO_PUBLIC_API_URL, which the app reads in
# constants/api.ts at build time, so a different server means a new build. eas.json is only touched while the
# build runs and is restored afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."

URL="${1:-}"; shift || true
DRY=0; LOCAL=""
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --local) LOCAL="--local" ;;
    *) echo "Opción desconocida: $a" >&2; exit 1 ;;
  esac
done
[ -n "$URL" ] && [ "$URL" != "-h" ] && [ "$URL" != "--help" ] || { sed -n '2,12p' "$0"; exit 1; }

URL="${URL%/}"
[[ "$URL" =~ ^https?://[A-Za-z0-9._-]+(:[0-9]+)?$ ]] || {
  echo "URL no válida: '$URL'. Usa http(s)://host[:puerto] sin ruta, p. ej. https://api.midominio.com" >&2; exit 1; }
case "$URL" in
  http://localhost*|http://127.*|https://localhost*|https://127.*)
    echo "AVISO: $URL apunta al propio teléfono; no llegará a tu servidor." >&2 ;;
esac

# Node and npx.
NODE="$(command -v node || command -v node.exe || true)"; NPX="$(command -v npx || command -v npx.cmd || true)"
[ -n "$NODE" ] && [ -n "$NPX" ] || { echo "Falta Node.js (node y npx)." >&2; exit 1; }

case "$NODE" in
  /mnt/*|*.exe)
    # WSL using the Windows Node: `npx` goes through cmd.exe, which cannot use a \\wsl$ working directory and
    # then cannot see the project. Run the eas-cli binary directly with node.exe instead.
    echo "AVISO: usas el Node de Windows desde WSL. Si EAS falla al empaquetar el proyecto, instala Node dentro de WSL" >&2
    echo "       (nvm) y vuelve a ejecutar este script, o corre el build desde Windows." >&2
    find_eas() { ls -d /mnt/c/Users/*/AppData/Local/npm-cache/_npx/*/node_modules/eas-cli/bin/run 2>/dev/null | head -1; }
    EAS_BIN="$(find_eas)"
    [ -n "$EAS_BIN" ] || { "$NPX" --yes eas-cli --version >/dev/null 2>&1 || true; EAS_BIN="$(find_eas)"; }
    [ -n "$EAS_BIN" ] || { echo "No pude instalar eas-cli. Prueba: npm install -g eas-cli" >&2; exit 1; }
    EAS=("$NODE" "$(wslpath -w "$EAS_BIN")") ;;
  *) EAS=("$NPX" --yes eas-cli) ;;
esac

# Temporary profile "apk": the same as "preview" plus the backend URL.
cp eas.json eas.json.orig
trap 'mv -f eas.json.orig eas.json' EXIT
"$NODE" -e '
  const fs = require("fs");
  const cfg = JSON.parse(fs.readFileSync("eas.json", "utf8"));
  cfg.build.apk = { extends: "preview", env: { EXPO_PUBLIC_API_URL: process.argv[1] } };
  fs.writeFileSync("eas.json", JSON.stringify(cfg, null, 2));
' "$URL"

echo "Backend:  $URL"
echo "Perfil:   apk (extiende preview, buildType apk)"
if [ "$DRY" -eq 1 ]; then
  echo "--- dry run: perfil que se usaría (no se construye nada) ---"
  "$NODE" -e 'console.log(JSON.stringify(JSON.parse(require("fs").readFileSync("eas.json", "utf8")).build.apk, null, 2))'
  exit 0
fi

"${EAS[@]}" whoami >/dev/null 2>&1 || { echo "No has iniciado sesión en Expo. Ejecuta: npx eas-cli login" >&2; exit 1; }
"${EAS[@]}" build --platform android --profile apk $LOCAL
echo "Listo: EAS muestra arriba el enlace de descarga del APK (también en https://expo.dev)."

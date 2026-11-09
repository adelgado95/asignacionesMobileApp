# asignacionesMobileApp — project memory

Expo SDK 53 / React Native (TypeScript, expo-router, react-native-paper, Ionicons) app for the congregation
assignments. **Read-only consumer of the Django backend in `../AsignacionesApp`** (its CLAUDE.md has the data model,
business rules and API). All UI text is Spanish, sentence case. Notes from the working session of Nov 2026.

## Run / check (WSL2 over Windows)
- Node is the Windows one: use `node.exe`. Type-check: `node.exe node_modules/typescript/bin/tsc --noEmit -p .`
- Bundle check: `node.exe node_modules/expo/bin/cli export --platform web --output-dir .export-check` (then `rm -rf .export-check`; the output dir must be inside the project).
- `npm install` works; `expo install` hit EPERM. `npx` goes through cmd.exe and cannot use a `\\wsl$` cwd — prefer `node.exe <script>`.
- Date helper tests: `node.exe node_modules/typescript/bin/tsc lib/weeks.ts lib/weeks.test.ts --module commonjs --target es2020 --esModuleInterop --skipLibCheck --outDir .test-build && node.exe .test-build/weeks.test.js` (then delete `.test-build`). No Jest in the project.
- Backend URL: `EXPO_PUBLIC_API_URL` in `.env` (gitignored, **currently `https://central.admincong.online`, i.e. production**; use `http://localhost:8000` for a local backend); default in `constants/api.ts` (`10.0.2.2` on Android emulator). It is inlined at build time.
- WSL also has a Linux Node 20 in `~/node/bin` (put it first in `PATH` for anything that spawns `#!/usr/bin/env node` scripts) and the Android SDK in `~/android-sdk` (platform 35, build-tools 35.0.0, NDK 27 via Gradle), JDK 17 from apt. `node_modules` was installed by Windows npm, so `node_modules/expo/bin/cli` lacked the exec bit (EAS failed with `spawn … EACCES`; fixed with `chmod +x`).
- Nothing has been run on a device by me: UI changes were only type-checked and bundled; the user gives feedback with screenshots. Phone access over the LAN is not set up (WSL2 NAT needs a Windows portproxy + firewall rules; the WSL IP changes after reboot; SDK 53 may need a dev build).

## Structure
- `app/_layout.tsx` → `AuthProvider` + `Stack.Protected` (login vs tabs). `app/login.tsx` (palette taken from the program: teal `#387C88`, gold `#D48C00`, wine `#942824`; no subtitle line).
- `app/(tabs)/_layout.tsx`: tabs **VyMC (initial route), Privilegios, Escuela, Mis partes**; `explore` is hidden (`href: null`, file kept). Custom full-width tab bar flush with the bottom (`lib/tabBarVisibility.tsx`: `HidingTabBar` hides on scroll down / shows on scroll up; each screen spreads `useHideTabBarOnScroll()` on its main ScrollView).
  - `index.tsx` = "Escuela": assignments by month/room/day, edit sheet (attendance, notes, minutes+seconds), its **own** stopwatch copy with "Guardar tiempo"/"Reiniciar" buttons (not refactored to the shared one).
  - `vymc.tsx`: weekly meeting program from `/api/vymc/`. Header is `WeekHeader` (title, congregation, logout icon, Mes/Año, week arrows). A week belongs to the month of its Monday; changing month/year jumps to that month's first Monday; weeks with no program show "Sin programa del …". Section colors tesoros `#575A5D`, maestros `#BE8900`, vida `#7E0024`, acomodadores `#3D5A6C`. Row layout: title + stopwatch on one line, people as "Etiqueta  Valor" lines below.
  - `privilegios.tsx`: only today and future meetings (`/api/programa-privilegios/`), "Próxima" marker.
  - `mis-partes.tsx`: `/api/mis-partes/`, compact day rows grouped by month, dots teal=privilegio, wine=VyMC, gold=asignación; shows a message if the user has no Person linked; refreshes on focus.
- `lib/`: `auth.tsx` (`useAuth`, `authFetch` with one in-flight refresh), `tokenStorage.ts` (expo-secure-store; localStorage on web), `weeks.ts` (pure Mon–Sun helpers), `dates.ts`, `types.ts`.
- `components/`: `Select` (Paper Menu combobox; `compact` = 44 px), `ScreenHeader` (title + "Cerrar sesión" text, used by Escuela/Privilegios/Mis partes), `WeekHeader`, `Stopwatch` (`TimerControl`, `TimerActions`, `useStopwatches`).

## VyMC stopwatch behavior (shared `components/Stopwatch.tsx`, used only by VyMC)
- One stopwatch per part (key `weekId:numero`), several can run at once; one shared 1 s interval. Red clock when over the part's minutes.
- Saved time from the backend ≠ 0:00 → the play button is **disabled** until that stopwatch has been used in this session (fix times in Django admin).
- **Autosave 3 s after pausing** (`POST /api/vymc/{id}/tiempo/`); resuming inside the 3 s cancels it. During those 3 s a short **"Reiniciar"** appears (discards this session's time, back to the saved value); after saving it disappears. "Tiempo guardado" shows for 2 s then vanishes. On error: "No se pudo guardar. Reintentar" (no automatic retry loop). No manual save button, no permanent reset.

## Design preferences (from the user)
- Clean, minimal, mobile-first (small screens, large touch targets ≥ 44 px), forms with comboboxes, Spanish copy.
- WeekHeader spacing scale 4/8/12/16/20/24, 20 px side padding in a single container, no extra horizontal margins on children. Max two font weights in that component.
- Project only has a light palette (`constants/Colors.ts`); there is no dark theme despite `userInterfaceStyle: automatic`.

## Build an APK
- **Local build without Expo/EAS (preferred):** `./scripts/build-apk-local.sh <url>` copies the project to `~/apk-build/app`, `npm ci`, `expo prebuild --platform android`, `gradlew assembleRelease` with `EXPO_PUBLIC_API_URL=<url>`; APK lands in `~/apk-build/out/asignaciones-<date>.apk`. Default ABI `arm64-v8a` only (`ABIS=` to change), debug-signed (installable, not for Play Store). First build took ~16 min; later ones are much faster. The first APK was built on 2026-11-09 against production and its bundle was verified to contain the URL; it has not been tried on a phone by me. Rebuild after any code change to see it on the phone.
- `scripts/build-apk.sh <https://api.example.com> [--dry-run|--local]` builds via **EAS cloud** using a temporary `apk` profile (extends `preview`, adds `EXPO_PUBLIC_API_URL`) and restores `eas.json`. Needs `npx eas-cli login` (the account was **not** logged in when tested, so no APK has been built). `expo-build-properties` already enables cleartext HTTP; `app.json` has the EAS projectId and package `com.ajdfdelgado.asignacionesMobileApp`. On WSL with Windows Node the script runs eas-cli through `node.exe` and warns that it may fail packing the project — then install Node inside WSL.
- Backend deploy lives in `../AsignacionesApp/deploy/` (`deploy.sh`, `make_backup.sh`, README).

## Login screen notes
- `app/login.tsx`: on Android (edge-to-edge, no window resize) the scroll content gets `paddingBottom = 48 + keyboard height` from `Keyboard` events and scrolls to the end on focus; iOS uses `KeyboardAvoidingView`. Added to fix the keyboard covering the password field; not yet confirmed on a device. Fallback if it still fails: `react-native-keyboard-controller` (new dependency).

## Open items
- Escuela still has its own stopwatch/buttons; align with VyMC if the user asks. `ScreenHeader` (text logout) differs from `WeekHeader` (icon logout).
- Seamos mejores maestros people appear only once Asignaciones for Nov–Dec are loaded in the backend.

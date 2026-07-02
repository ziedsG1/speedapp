# SpeedApp — Marathon Runner App

React Native (Expo) app for runners to plan marathons, view animated 3D Google Maps, and save runs to a personal library with map snapshots.

**Bundle ID:** `com.speedapp.runner` · **Version:** 1.0.0

---

## Documentation

| Document | Description |
|----------|-------------|
| **[GITHUB-SETUP.md](./GITHUB-SETUP.md)** | GitHub Actions + download IPA + Sideloadly install (Windows-friendly) |

---

## Features at a glance

- Welcome screen with name, age, and location permission
- Marathon calculator — 5K, 10K, Half, Full marathon
- Animated Google Map with 3D buildings and street routes
- Google Directions API for real walking paths
- Library / history with map snapshot capture
- Custom dark map styling (`constants/mapStyle.ts`)

---

## Quick start

### Windows (app changes + CI build)

```powershell
cd c:\Users\zied\Desktop\speedapp
npm install
# edit app/ components/ etc.
git add .
git commit -m "Your change"
git push origin main
```

Then download the IPA from **GitHub → Actions → SpeedApp-ipa** and install with [Sideloadly](https://sideloadly.io/). Details: [GITHUB-SETUP.md](./GITHUB-SETUP.md).

### Local development

```powershell
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `a` for Android emulator.

### macOS (run on device)

```bash
npm install
npm run prebuild:ios
cd ios && pod install
npx expo run:ios --device
```

Set your **Team** in Xcode if needed, connect iPhone, press **Run**.

---

## Project layout

```
app/                  Screens (welcome, plan, library)
components/           Map, marathon calculator
lib/                  Directions API, marathon math, storage
constants/            Colors, map style
.github/workflows/    build-ios-ipa.yml — unsigned IPA on push to main
```

---

## Important constraints

- **IPA cannot be built on Windows alone** — use GitHub Actions or a Mac.
- CI produces an **unsigned** IPA; sign with Apple ID (Sideloadly / Xcode).
- Free Apple ID installs **expire after ~7 days** — re-sideload to refresh.
- Google Maps requires an API key with **Maps SDK for iOS** and **Directions API** enabled.

---

## Google Maps API key

1. [Google Cloud Console](https://console.cloud.google.com/) → enable Maps SDK for iOS + Directions API
2. Create an API key
3. For local dev: copy `.env.example` → `.env.local` and set `GOOGLE_MAPS_API_KEY`
4. For GitHub builds: add `GOOGLE_MAPS_API_KEY` as a repository secret (optional but recommended)

---

## Notes

- Routes use **Google Directions API** in walking mode with fallback if unavailable.
- Map snapshots use `MapView.takeSnapshot()` when saving to the library.
- Edit `constants/mapStyle.ts` to customize the map look.

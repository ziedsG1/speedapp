# SpeedApp — Marathon Runner App

iOS runner app: plan street routes, live GPS tracking, marathon calculator, and saved run library.

**Bundle ID:** `com.speedapp.runner` · **Version:** 1.0.0

---

## Build IPA (Windows → GitHub Actions)

```powershell
cd c:\Users\zied\Desktop\speedapp
git add .
git commit -m "Your change"
git push origin main
```

Download **SpeedApp-ipa** from **GitHub → Actions**, then install with [Sideloadly](https://sideloadly.io/).

Full steps: [GITHUB-SETUP.md](./GITHUB-SETUP.md)

---

## What the CI build uses

Only iOS IPA tooling — no EAS, no Android, no web export:

1. `npm ci`
2. `npx expo prebuild --platform ios --clean --no-install`
3. `pod install` in `ios/`
4. `xcodebuild` → unsigned `.ipa` artifact

Workflow: `.github/workflows/build-ios-ipa.yml`

---

## Project layout

```
app/                  Screens (welcome, plan, library)
components/           Map, marathon calculator, runner marker
lib/                  Routing (OSRM / SerpApi), storage, tracking
constants/            Colors, map style, API keys
.github/workflows/    build-ios-ipa.yml
scripts/              build-ios-ipa.sh (optional local Mac build)
```

---

## GitHub secrets (optional)

| Secret | Purpose |
|--------|---------|
| `GOOGLE_MAPS_API_KEY` | Google Maps tiles on iOS |
| `SERPAPI_API_KEY` | Optional premium routing |

Street routing works without Google Directions — OSRM is used as a free fallback.

---

## macOS only (local IPA)

```bash
npm ci
npm run prebuild:ios
cd ios && pod install && cd ..
bash scripts/build-ios-ipa.sh
```

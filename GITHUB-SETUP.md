# Build IPA with GitHub Actions

Follow these steps on your Windows PC to get the `.ipa` file.

---

## Step 1 — Create a GitHub account (if needed)

Go to [https://github.com/signup](https://github.com/signup) and create a free account.

---

## Step 2 — Create a new repository on GitHub

1. Open [https://github.com/new](https://github.com/new)
2. **Repository name:** `speedapp` (or any name you like)
3. Leave it **Public** or **Private** (both work)
4. **Do NOT** check "Add a README" (we already have files)
5. Click **Create repository**

Keep that page open — you will need the repo URL.

---

## Step 3 — Push this project to GitHub

Open **PowerShell** and run these commands one by one.

Replace `YOUR_GITHUB_USERNAME` with your real GitHub username:

```powershell
cd c:\Users\zied\Desktop\speedapp

git init
git add .
git commit -m "Add SpeedApp iOS runner app"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/speedapp.git
git push -u origin main
```

When prompted, sign in with your GitHub account (browser or token).

---

## Step 4 — (Optional) Add API keys

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Add secrets:

| Name | Purpose |
|------|---------|
| `GOOGLE_MAPS_API_KEY` | Google Maps display on iOS |
| `SERPAPI_API_KEY` | Optional SerpApi routing |

Street routing works without Google Directions — the app uses **OSRM** (free) by default.

---

## Step 5 — Run the build workflow

1. GitHub repo → **Actions**
2. Open **Build iOS IPA**
3. Click **Run workflow** → **Run workflow** (or push to `main` to trigger automatically)
4. Wait for the green checkmark (~10–20 minutes)

---

## Step 6 — Download the IPA

1. Open the completed workflow run
2. Scroll to **Artifacts**
3. Download **SpeedApp-ipa**
4. Unzip — you get `SpeedApp-unsigned.ipa`

---

## Step 7 — Install on iPhone (Sideloadly)

1. Download [Sideloadly](https://sideloadly.io/) on Windows
2. Connect iPhone via USB
3. Drag `SpeedApp-unsigned.ipa` into Sideloadly
4. Enter your Apple ID
5. Click **Start**

The app installs on your phone. Re-sign every 7 days with a free Apple ID, or use a paid developer account for longer.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails on prebuild | Check `app.json` / `app.config.ts`; ensure Node 24 in CI |
| Maps blank on device | Add `GOOGLE_MAPS_API_KEY` secret; enable **Maps SDK for iOS** in Google Cloud |
| "Untrusted developer" | iPhone → Settings → General → VPN & Device Management → Trust |
| Workflow not listed | Push to `main` once; workflow file must be on default branch |

---

## What is NOT used

- **EAS Build** — removed; CI builds IPA directly with Xcode
- **Android / web** — iOS IPA only
- **Expo Go** — not needed; install the IPA on device

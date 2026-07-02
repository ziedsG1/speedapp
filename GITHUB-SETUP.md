# Option 2 — Build IPA with GitHub Actions

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

## Step 4 — (Optional) Add Google Maps API key

Maps and street routing work best when you add your Google Maps API key as a GitHub secret:

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `GOOGLE_MAPS_API_KEY`
4. Value: your Google Cloud API key (Maps SDK + Directions API enabled)

The build still works without this secret, but maps may not load on device.

---

## Step 5 — Run the build workflow

1. Open your repo on GitHub: `https://github.com/YOUR_GITHUB_USERNAME/speedapp`
2. Click the **Actions** tab
3. Click **Build iOS IPA** in the left sidebar
4. Click **Run workflow** → **Run workflow** (green button)
5. Wait about **10–15 minutes** for the build to finish (green checkmark)

---

## Step 6 — Download the IPA

1. Click the completed workflow run
2. Scroll down to **Artifacts**
3. Download **SpeedApp-ipa**
4. Unzip it — inside you will find `SpeedApp-unsigned.ipa`

---

## Step 7 — Install on your iPhone

The GitHub build produces an **unsigned** IPA. To install it on iPhone you need to **sign** it first.

### Easiest way on Windows: Sideloadly

1. Download [Sideloadly](https://sideloadly.io/) on your PC
2. Connect your iPhone with a USB cable
3. Drag `SpeedApp-unsigned.ipa` into Sideloadly
4. Enter your **Apple ID** email (free account works)
5. Click **Start** — the app installs on your iPhone

**Note:** With a free Apple ID, the app expires after **7 days**. Re-install with Sideloadly to refresh.

### Alternative: AltStore

1. Install [AltStore](https://altstore.io/) on iPhone + AltServer on PC
2. Use AltStore to sideload the signed IPA

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `git push` asks for password | Use a [Personal Access Token](https://github.com/settings/tokens) instead of password |
| Workflow fails on `pod install` | Re-run the workflow — GitHub macOS runners occasionally need a retry |
| Workflow fails on `expo prebuild` | Check the Actions log; ensure `app.json` / `app.config.ts` is valid |
| iPhone says "Unable to install" | Sign the IPA with Sideloadly/AltStore using your Apple ID |
| App stops working after 7 days | Re-sideload with Sideloadly (free Apple ID limit) |
| Maps are blank on device | Add `GOOGLE_MAPS_API_KEY` secret and rebuild |

---

## Automatic builds

Every time you push to the `main` branch, GitHub will automatically rebuild the IPA.

```powershell
# After editing files:
git add .
git commit -m "Update app"
git push
```

Then download the new IPA from **Actions → Artifacts**.

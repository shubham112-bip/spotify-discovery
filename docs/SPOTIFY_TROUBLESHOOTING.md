# Spotify Developer — Troubleshooting

If you're stuck getting Client ID / Client Secret, use this guide.

Official docs: [Create an app](https://developer.spotify.com/documentation/web-api/tutorials/getting-started) · [Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)

---

## Step-by-step (5 minutes)

### 1. Open dashboard
Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and log in.

### 2. Create app
Click **Create app** (or **Create an app**).

Fill in:
| Field | Value |
|-------|--------|
| App name | `Commute Compass` |
| App description | `AI commute music discovery MVP for fellowship project` |
| Redirect URI | `http://127.0.0.1:3000/api/auth/callback` |
| Terms checkbox | ✅ Must tick **Developer Terms of Service** |

Click **Save** / **Create**.

### 3. Get Client ID
After creation, you land on the app page. **Client ID** is visible immediately — copy it.

### 4. Get Client Secret
Click **Settings** → find **Client Secret** → click **View client secret** → copy it.

### 5. Save to `.env`
```powershell
cd "c:\Users\User\Graduation Project-2\spotify-discovery"
copy .env.example .env
```

Edit `.env`:
```
SPOTIFY_CLIENT_ID=paste_here
SPOTIFY_CLIENT_SECRET=paste_here
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
```

---

## Common problems

### ❌ Redirect URI won't save / shows error
**Cause:** Using `localhost` — Spotify blocks this on new apps.

**Fix:** Use exactly:
```
http://127.0.0.1:3000/api/auth/callback
```
Not `localhost`. Not missing `http://`. Path must match what your app uses later.

Reference: [Spotify security update (Feb 2025)](https://developer.spotify.com/blog/2025-02-12-increasing-the-security-requirements-for-integrating-with-spotify)

---

### ❌ Can't find "Create app" button
**Try:**
- Complete account setup — accept **Developer Terms of Service** on first login
- Use desktop browser (not mobile)
- Dashboard → top right **Create app**

---

### ❌ Can't find Client Secret
It's hidden by default:
1. Open your app in Dashboard
2. Click **Settings**
3. Click **View client secret** (may ask for password)

---

### ❌ "Something went wrong" when creating app
**Try:**
- Shorter app name (no special characters)
- Add Website field: `https://github.com/shubham112-bip/spotify-discovery`
- Different browser or clear cache
- Wait 24h if account is brand new (rare)

---

### ❌ Dashboard asks for "Extended Quota Mode"
**You don't need this** for the fellowship project. Skip it for now — your own account is enough for demo/testing.

---

## Can't get it working today?

**You can skip Spotify for now** and continue Day 1:

| Task | Needs Spotify? |
|------|----------------|
| Block 2 — collect reviews | No |
| Block 3 — build review AI pipeline | No (needs LLM API key only) |
| Google Form + interviews | No |
| MVP build (Day 7+) | Yes |

Come back to Spotify before **23 Jun** when MVP starts. Part 1 (review analysis) does not require Spotify credentials.

---

## Quick test (optional — after `.env` is filled)

In PowerShell:
```powershell
$clientId = "YOUR_CLIENT_ID"
$clientSecret = "YOUR_CLIENT_SECRET"
$bytes = [System.Text.Encoding]::UTF8.GetBytes("${clientId}:${clientSecret}")
$base64 = [Convert]::ToBase64String($bytes)
curl -X POST "https://accounts.spotify.com/api/token" `
  -H "Authorization: Basic $base64" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "grant_type=client_credentials"
```

If you get JSON with `"access_token"`, your credentials work.

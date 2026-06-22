# Day 1 Block 1 — Account Setup Checklist

Complete these manual steps (cannot be automated). Check each box when done.

---

## 1. GitHub Repository

- [ ] Create account at [github.com](https://github.com) if needed
- [ ] Create **public** repo named `spotify-discovery`
- [ ] From this folder, run:

```powershell
cd "c:\Users\User\Graduation Project-2\spotify-discovery"
git init
git add .
git commit -m "Day 1 Block 1: project scaffold"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/spotify-discovery.git
git push -u origin main
```

- [ ] Copy repo URL → paste into root `README.md` Submission Links table

---

## 2. Spotify Developer Dashboard (for MVP — Week 2)

- [x] Register / log in at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
- [ ] Click **Create app**
  - **App name:** Commute Compass
  - **App description:** AI commute music discovery MVP for fellowship project
  - **Website:** your GitHub repo URL (optional): `https://github.com/shubham112-bip/spotify-discovery`
  - **Redirect URI:** `http://127.0.0.1:3000/api/auth/callback`  
    ⚠️ **`localhost` is NOT allowed** on new apps (Spotify rule since Apr 2025). Use `127.0.0.1` exactly.
- [ ] Open app → **Settings** → copy **Client ID** and **Client Secret**
- [ ] Add credentials to `.env` (copy from `.env.example` — never commit `.env`)

```powershell
cd "c:\Users\User\Graduation Project-2\spotify-discovery"
copy .env.example .env
# Edit .env and paste SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET
```

**Redirect URIs to add (Settings → Redirect URIs):**

| Environment | URI |
|-------------|-----|
| Local dev | `http://127.0.0.1:3000/api/auth/callback` |
| Production (add on Day 14) | `https://YOUR-APP.vercel.app/api/auth/callback` |

**Do NOT use** `http://localhost:3000/...` — Spotify will reject it. See [Spotify redirect URI docs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).

**Note:** For the fellowship demo, testing with your own Spotify account is enough. Extended Quota Mode is only needed if many external users will log in.

---

## 3. LLM API Key (for review pipeline + MVP)

Pick **one**:

### Option A — Anthropic Claude (recommended)
- [ ] [console.anthropic.com](https://console.anthropic.com) → API Keys → Create
- [ ] Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

### Option B — OpenAI
- [ ] [platform.openai.com](https://platform.openai.com) → API Keys
- [ ] Add to `.env`: `OPENAI_API_KEY=sk-...`

Copy `.env.example` → `.env` and fill values. **Never commit `.env`.**

---

## 4. n8n Cloud (optional — for workflow link deliverable)

- [ ] Sign up at [n8n.io](https://n8n.io) (free tier)
- [ ] Create workflow: CSV → Claude API → Google Sheets/Airtable
- [ ] Export workflow JSON → `review-engine/n8n-workflow.json`

**Alternative:** Python script only (`review-engine/analyze_reviews.py`) + Loom video walkthrough.

---

## 5. Google Form — Interview Screening

- [ ] Go to [forms.google.com](https://forms.google.com) → Blank form
- [ ] Title: **Spotify Listening Interview — 30 min (Research Project)**
- [ ] Copy questions from [research/screening-form.md](../research/screening-form.md)
- [ ] Settings → **Accepting responses** → Get link
- [ ] Paste Form URL into root `README.md`

---

## 6. Deployment Accounts (Week 2–3 — create now if you want)

| Service | Use | Sign up |
|---------|-----|---------|
| Vercel | MVP hosting | [vercel.com](https://vercel.com) |
| Streamlit Cloud | Review demo | [share.streamlit.io](https://share.streamlit.io) |
| Google Slides | Deck | [slides.google.com](https://slides.google.com) |

---

## Block 1 Complete When

- [ ] Folder structure exists locally
- [ ] Git repo initialized (pushed to GitHub when ready)
- [ ] Spotify Developer app created
- [ ] LLM API key in `.env`
- [ ] Google Form draft live (or questions ready in `research/screening-form.md`)

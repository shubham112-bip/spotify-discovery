# Commute Compass — Spotify Music Discovery MVP

AI-powered context-aware music discovery for daily commute listeners. Built as a Growth PM Fellowship project.

**Product:** Spotify  
**Segment:** Commute listeners (daily 30–60 min, repeat playlists)  
**Solution:** Commute Compass — context-aware AI discovery agent with natural-language explanations

---

## How It Works

User provides context (duration, mood, adventure level) → Gemini AI generates an 8-track session with **"why this song"** explanations → creates a Spotify playlist on the user's account.

### Playlist Architecture
- **1–2 Warm-up tracks** — familiar, low-risk songs matching the current mood
- **4–5 Discovery tracks** — new songs outside the user's top artists, aligned with their genres
- **1–2 Fallback tracks** — reliable favorites to close the session

---

## Project Structure

```
spotify-discovery/
├── mvp/commute-compass/    # Main MVP app (Express + Vanilla JS)
│   ├── server.js           # Backend: Spotify OAuth, Gemini AI, playlist creation
│   ├── vercel.json         # Vercel deployment config
│   └── public/             # Frontend: index.html, app.js, styles.css
│
└── review-engine/          # Review analysis pipeline + dashboard
    ├── server.js            # Express server for review dashboard
    ├── analyze_reviews.js   # Gemini-powered review tagging
    ├── collect_reviews.js   # App Store / Play Store scraper
    └── index.html           # Interactive review dashboard
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js + Express |
| Frontend | Vanilla HTML/CSS/JS |
| AI | Google Gemini API (structured JSON output) |
| Music | Spotify Web API (OAuth + Client Credentials) |
| Deployment | Vercel (serverless) |

---

## Local Development

```bash
# Clone and install
git clone https://github.com/shubham112-bip/spotify-discovery.git
cd spotify-discovery/mvp/commute-compass
npm install

# Set up environment variables
cp .env.example .env
# Fill in SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, GEMINI_API_KEY

# Run
npm start
# → http://localhost:3001
```

---

## Live URL

🚀 **[https://spotify-discovery-gamma.vercel.app/](https://spotify-discovery-gamma.vercel.app/)**

---

## License

ISC

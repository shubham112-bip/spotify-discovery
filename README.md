# Spotify Music Discovery — Commute Compass

Growth PM fellowship project: AI-powered review analysis → user interviews → problem definition → AI-native MVP.

**Product:** Spotify  
**Segment:** Commute listeners (daily 30–60 min, repeat playlists)  
**MVP:** Commute Compass — context-aware AI discovery agent with explanations

---

## Submission Links

| Deliverable | Link | Status |
|-------------|------|--------|
| Review analysis workflow | _TBD — add n8n or Loom URL_ | ☐ |
| Review query demo | _TBD — add Streamlit URL_ | ☐ |
| MVP (Commute Compass) | _TBD — add production URL_ | ☐ |
| 10-slide deck (PDF) | _TBD — add Google Drive or GitHub link_ | ☐ |
| GitHub repo | [github.com/shubham112-bip/spotify-discovery](https://github.com/shubham112-bip/spotify-discovery) | ☑ |
| Interview screening form | _TBD — add Google Form URL_ | ☐ |

---

## Project Structure

```
spotify-discovery/
├── data/raw/           # App Store, Play Store, Reddit exports
├── data/analyzed/      # LLM-tagged JSON output
├── review-engine/      # Pipeline + Streamlit demo
├── research/           # Interviews, synthesis, problem statement
├── mvp/commute-compass/ # Deployed MVP
└── deck/               # NL Spotify.pdf
```

---

## Quick Start

1. **Accounts:** See [docs/SETUP_ACCOUNTS.md](docs/SETUP_ACCOUNTS.md)
2. **Day 1 plan:** See parent folder `SPOTIFY_DISCOVERY_PROJECT_PLAN.md`
3. **Collect reviews:** Save CSVs to `data/raw/` with columns: `id, source, date, rating, text, url`

---

## Timeline

| Milestone | Date |
|-----------|------|
| Part 1 complete (review engine live) | 22 Jun 2026 |
| 6 interviews done | 26 Jun 2026 |
| MVP production deploy | 30 Jun 2026 |
| **Submit** | **6 Jul 2026** |

# Problem Statement: Spotify Music Discovery for Routine Listeners

**Project:** Spotify Music Discovery — Commute Compass  
**Date:** June 30, 2026  
**Evidence base:** 946 AI-analyzed reviews (Part 1) + 6 user interviews (Part 2)

---

## Target Segment

**Routine listeners aged 19–45 who use Spotify during daily commutes, gym sessions, household chores, or evening wind-down** — moments where music serves as emotional infrastructure (energy, calm, focus, nostalgia) rather than active entertainment.

These users:
- Listen 20–60 minutes per session during a consistent daily or weekly routine
- Maintain 1–3 "go-to" playlists that they replay for days or weeks at a time
- Skip unfamiliar songs within 20–30 seconds if the mood doesn't match
- Rarely engage with Spotify's discovery surfaces (Discover Weekly used by 0/6 regularly; DJ used by 0/6 actively)
- Have *positive intent* toward new music but negative *context tolerance* — they'll explore on a free weekend but not during a rushed commute

**Segment size signal:** "Playlist listening" and "Playing specific songs" are the #1 and #2 user behaviors in our 946-review corpus, with "Replaying songs" appearing consistently. Commute and routine listening was identified as the dominant use case in our review analysis (§3).

---

## Job-to-Be-Done

> **When I'm** starting my daily routine (commute, gym, chores, evening wind-down),  
> **I want to** press play and hear music that matches my current mood and energy level,  
> **So that I can** use music as reliable emotional scaffolding without spending cognitive effort on selection.

Secondary JTBD (lower priority, same segment):

> **When I've been** looping the same playlist for weeks and it starts feeling stale,  
> **I want to** find a few fresh tracks that fit the same vibe without disrupting my routine,  
> **So that I can** keep my listening experience alive without the risk of a bad recommendation ruining my session.

---

## Root Cause

### Primary: Context-free recommendations in context-heavy listening moments

Spotify's recommendation engine optimizes for **taste similarity** (collaborative filtering, content-based matching) without accounting for **moment context** (time of day, activity, energy state, cognitive availability). The result:

- A user who listens to Arijit Singh at midnight and Brazilian phonk at the gym receives recommendations that average across both contexts, matching neither
- Discover Weekly drops every Monday regardless of whether the user is in a discovery mindset or a survival-commute mindset
- Daily Mix and Radio stay close to taste but ignore *when and how* the user is listening
- Spotify DJ attempts context awareness but uses an intrusive voice format that 5/6 users rejected

**Evidence from interviews:**
- P01: "Some mornings I want hype and some mornings I literally cannot handle anything upbeat" → same user, different needs, Spotify treats as one
- P03: "If it's morning before gym, give me hard-hitting tracks. If I'm coming back home, switch to chill" → wants automatic phase detection
- P06: "It treats every drive the same" → morning drive ≠ evening drive

**Evidence from review corpus:**
- "AI DJ recommends high-energy pop music when [user is] trying to sleep" (§3)
- "Cross-mix contamination" — same songs appear across contextually different mixes (§2)
- "Algorithm hard-locks onto a single genre" regardless of the user's current state (§1)

### Secondary: Zero-trust discovery surfaces with no safety net

When users *do* attempt discovery, the experience offers no safety net:

1. **No warmup:** Discovery surfaces (Discover Weekly, Radio) start with unknown tracks, forcing immediate judgment
2. **No explanation:** Users don't know *why* a song was recommended, so they can't assess fit before investing 30 seconds
3. **No fallback:** If discovery fails mid-session, the user must manually navigate back to their familiar playlist
4. **Genre drift:** Song Radio and autoplay frequently drift across energy levels mid-session (pop → acoustic, bhajans → remixes)

**Evidence from interviews:**
- P03: "I don't want to keep skipping every 20 seconds while lifting" — discovery without a safety net disrupts the physical activity
- P04: "Playlists start mixing in newer remixes or random songs that don't match the mood" — no tonal guardrails
- P06: "Recommendations go in a completely different direction after one song" — genre drift without consent

---

## Why Existing Spotify Features Fail for This Moment

| Feature | What it does | Why it fails for routine listeners |
|---|---|---|
| **Discover Weekly** | 30 new songs every Monday | Forgotten by 5/6 users; not tied to any specific listening moment; no context filtering |
| **Daily Mix** | 6 mixes blending familiar + new | Most trusted surface (4/6 use it) but no activity/mood awareness — same mix for gym and bedtime |
| **Song Radio** | Similar tracks to a seed song | Genre drift after 5-10 songs; no energy-level guardrails |
| **Spotify DJ** | AI voice narrating between songs | Rejected by 5/6 users; voice interrupts the listening flow; mood detection inconsistent |
| **Autoplay** | Plays similar music when queue ends | Loops same 30-50 tracks (corpus §2); no context awareness |

**The gap:** No existing feature combines **context input** (mood, activity, time) + **graduated risk** (familiar first, then controlled novelty) + **explanation** (why this song fits right now).

---

## MVP Hypothesis

> **If we provide** routine listeners with a context-aware session planner that starts with familiar warmup tracks, introduces 4-5 discovery tracks in the same energy lane with short explanations, and closes with reliable fallbacks,  
> **Then** users will engage with discovery during routine moments where they currently default to repeat listening,  
> **Because** the graduated structure (warmup → discovery → fallback) reduces the risk of a bad recommendation disrupting their emotional scaffolding.

### Key metrics to validate:
- **Discovery rate:** % of AI-suggested tracks that users listen to beyond 30 seconds (vs. skip)
- **Session completion:** % of users who listen through the full 8-track session (vs. abandoning mid-session)
- **Repeat playlist dependency:** Do users return to their go-to playlist less frequently after using Commute Compass?
- **Return rate:** Do users come back to Commute Compass for a second session within 7 days?

---

## Business Impact

| Metric | Logic | Evidence |
|---|---|---|
| **Daily retention** | Commute/routine = daily touchpoint; small discovery wins compound into habit | 4/6 participants are daily listeners; none use discovery features daily |
| **Discovery feature adoption** | Discover Weekly, DJ, Radio are underused → massive growth lever if context-aware | 0/6 use Discover Weekly regularly; 0/6 actively use DJ |
| **Premium differentiation** | "Personalized to my life moment" vs. commodity catalog | P01, P03, P06 explicitly asked for time-of-day awareness — a premium-worthy feature |
| **Long-tail catalog leverage** | Context-aware recs surface deep cuts without paid acquisition | P04 wants forgotten 90s deep cuts; P05 wants rare devotional tracks — both underserved by popularity-biased algorithms |
| **Churn prevention** | Users who discover 1-2 new songs per week have higher retention than pure repeaters | P03 acknowledged staleness after weeks — without fresh injection, he'll eventually disengage |

---

*Problem statement locked June 30, 2026. Validated against 946-review AI corpus (Part 1) and 6 user interviews (Part 2).*

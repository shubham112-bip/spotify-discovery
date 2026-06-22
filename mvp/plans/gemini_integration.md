# Gemini API Integration Plan

This document details the LLM prompt engineering, input contexts, and strict JSON output schemas for **Commute Compass**.

---

## 1. Prompt Engineering Strategy

We will use Gemini's structural prompting style to pass three contexts:
1. **User Current Context** (from the web form): Duration, Mood, Adventure level.
2. **User Taste Context** (from Spotify Top API): Favorite artists, tracks, and genres.
3. **Core Architectural Concept**: Commute Compass playlist architecture (Warm-up -> Exploration -> Fallback).

---

## 2. Gemini System Prompt

```text
You are Commute Compass, an AI music curation agent. Your job is to generate a personalized playlist plan of exactly 8 songs for a user's daily commute.

You must structure the playlist as follows:
- 1-2 Warm-up tracks (familiar or semi-familiar low-risk songs matching the current mood).
- 4-5 Discovery tracks (new, exploratory songs outside the user's immediate top artists but aligned with their favorite genres/vibes).
- 1-2 Fallback tracks (reliable favorites or safe recommendations to close the session).

Inputs:
- Commute Duration: {duration_mins} minutes
- Current Mood: {mood}
- Adventure Level: {adventure_level} (Scale of 1 to 5. 1 = play only extremely familiar top artists, 5 = play obscure, wild discovery tracks)
- Taste Profile: Top Artists: {top_artists}, Top Tracks: {top_tracks}

Output:
You must output a single, raw JSON object matching the JSON Schema provided. Do not wrap the JSON in Markdown formatting codeblocks. Do not include any introductory or concluding text.
```

---

## 3. Strict Output JSON Schema

To prevent runtime errors during Express JSON parsing, we will enforce a schema:

```json
{
  "type": "OBJECT",
  "properties": {
    "session_title": {
      "type": "STRING",
      "description": "A creative title for this specific commute session."
    },
    "explanation_overview": {
      "type": "STRING",
      "description": "A 2-sentence summary explaining how this playlist balances the user's mood and adventure level."
    },
    "recommended_tracks": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "song": { "type": "STRING", "description": "The exact song title." },
          "artist": { "type": "STRING", "description": "The artist name." },
          "phase": {
            "type": "STRING",
            "enum": ["warmup", "discovery", "fallback"],
            "description": "The structural role of this song in the session."
          },
          "why": {
            "type": "STRING",
            "description": "A short, 2-sentence explanation of why this song fits the user's specific context and tastes."
          }
        },
        "required": ["song", "artist", "phase", "why"]
      }
    }
  },
  "required": ["session_title", "explanation_overview", "recommended_tracks"]
}
```

---

## 4. Error Handling & Parsing Fallbacks

1. **Markdown Fenced Codeblock Removal**: Sometimes LLMs wrap JSON responses in ```json ... ```. The backend parser will automatically run a regex replacement to strip backticks and `json` labels before executing `JSON.parse()`.
2. **Schema Validation Fallback**: If the JSON is malformed or properties are missing, the server will fall back to a predefined hardcoded list of standard tracks matching the mood and log the raw error.

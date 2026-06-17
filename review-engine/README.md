# Review Analysis Engine

AI pipeline to tag App Store, Play Store, and Reddit feedback at scale.

## Pipeline

```
data/raw/*.csv → analyze_reviews.py (or n8n) → data/analyzed/reviews_tagged.json → streamlit_app.py
```

## Files (created in Week 1)

| File | Purpose |
|------|---------|
| `prompts/extract_review.txt` | LLM prompt for structured JSON per review |
| `prompts/synthesize_corpus.txt` | Second-pass prompt for 6 assignment questions |
| `analyze_reviews.py` | Python batch processor (Day 3) |
| `streamlit_app.py` | Query demo (Day 5) |
| `n8n-workflow.json` | Exported workflow (Day 5) |

## CSV input format

```csv
id,source,date,rating,text,url
1,app_store,2025-03-12,2,"Discover Weekly is always the same artists",https://...
```

## Output schema

See `SPOTIFY_DISCOVERY_PROJECT_PLAN.md` → Part 1 → LLM extraction schema.

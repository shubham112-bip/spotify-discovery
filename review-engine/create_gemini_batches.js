const fs = require('fs');
const path = require('path');

// CSV Parser Helper
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip the escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Load and parse CSV
function loadReviewsFromCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: CSV file not found at ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const reviews = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = parseCsvLine(line);
    if (parts.length >= 5) {
      reviews.push({
        id: parts[0],
        source: parts[1],
        date: parts[2],
        rating: parts[3],
        text: parts[4]
      });
    }
  }
  return reviews;
}

function generateBatches() {
  const rawReviewsPath = path.join(__dirname, '..', 'data', 'raw', 'all_reviews.csv');
  const batchesDir = path.join(__dirname, '..', 'data', 'batches');

  if (!fs.existsSync(batchesDir)) {
    fs.mkdirSync(batchesDir, { recursive: true });
  }

  const reviews = loadReviewsFromCsv(rawReviewsPath);
  console.log(`Loaded ${reviews.length} reviews for batching.`);

  const batchSize = 40;
  const totalBatches = Math.ceil(reviews.length / batchSize);

  for (let b = 0; b < totalBatches; b++) {
    const batchReviews = reviews.slice(b * batchSize, (b + 1) * batchSize);
    const batchNumber = String(b + 1).padStart(2, '0');
    const batchFilePath = path.join(batchesDir, `batch_${batchNumber}.txt`);

    let content = `Analyze the following batch of ${batchReviews.length} user reviews for Spotify. Identify if they describe any recommendations or discovery barriers.
Return ONLY a markdown table with the following 7 columns:
ID | Sentiment | Barrier Type | Themes | Listening Behavior | Unmet Need | Summary Insight

Guidelines:
- ID: EXACTLY the ID provided for each review. Do not change, modify, or truncate the ID.
- Sentiment: "positive", "neutral", or "negative".
- Barrier Type: Categorize the main recommendation/discovery barrier. Choose EXACTLY one from:
  * "Repetition" (getting same songs/playlists repeatedly, algorithm feels stuck)
  * "OverPersonalization" (everything is tailored, echo chambers, lack of organic discovery)
  * "BlockedArtistsIgnored" (algorithm plays blocked/hidden artists)
  * "SmartShuffleIssues" (complaints about smart shuffle repeating or playing bad songs)
  * "UI_UX_Friction" (navigation, layout changes, adding music is annoying)
  * "PricingIncrease" (dislike of price increases vs. quality)
  * "AlgorithmMismatch" (totally wrong genres/moods, unrelated recommendations)
  * "Other" (other technical issues/complaints about recommendations)
  * "None" (no barrier mentioned, e.g., positive review, simple audio bug)
- Themes: A comma-separated list of keywords (e.g. "Discover Weekly", "Smart Shuffle", "Price Hike", "Repeat Listening").
- Listening Behavior: Context/goal user wants (e.g. "commute listening", "background music", "finding new artists", "playlist curation", or "Not specified").
- Unmet Need: What control/feature is missing (e.g. "exclude genres", "better block list", "more variety", or "Not specified").
- Summary Insight: A 1-2 sentence summary of the specific user pain point.

CRITICAL: Return ONLY the raw markdown table (starting with the header row). Do not include introductory text, code block backticks (like \`\`\`), or conclusion text.

Batch to analyze:
================
`;

    batchReviews.forEach(item => {
      content += `ID: ${item.id}\nText: ${item.text}\n---\n`;
    });

    fs.writeFileSync(batchFilePath, content, 'utf8');
    console.log(`Created ${batchFilePath} with ${batchReviews.length} reviews.`);
  }

  console.log(`\nSuccessfully created ${totalBatches} batch files in data/batches/`);
}

generateBatches();

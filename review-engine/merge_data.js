const fs = require('fs');
const path = require('path');

// Helper to escape CSV values
function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  let str = String(val).replace(/\r?\n|\r/g, ' ').replace(/"/g, '""');
  return `"${str}"`;
}

// Character-by-character CSV parser for a single line
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

// Helper to load reviews from a CSV file
function loadReviewsFromCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}. Skipping.`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const reviews = [];

  // Index 0 is header: id,source,date,rating,text,url
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = parseCsvLine(line);
    if (parts.length >= 6) {
      reviews.push({
        id: parts[0],
        source: parts[1],
        date: parts[2],
        rating: parts[3] ? parts[3] : '',
        text: parts[4],
        url: parts[5]
      });
    } else {
      console.warn(`Line ${i + 1} in ${path.basename(filePath)} is malformed (only ${parts.length} columns). Line content: ${line}`);
    }
  }
  
  return reviews;
}

function main() {
  const dataDir = path.join(__dirname, '..', 'data', 'raw');
  const appStorePath = path.join(dataDir, 'app_store_reviews.csv');
  const playStorePath = path.join(dataDir, 'play_store_reviews.csv');
  const redditPostsPath = path.join(dataDir, 'reddit_posts.csv');
  const allReviewsPath = path.join(dataDir, 'all_reviews.csv');

  console.log('Starting merge of Spotify review datasets...');

  const appStoreReviews = loadReviewsFromCsv(appStorePath);
  console.log(`Loaded ${appStoreReviews.length} App Store reviews.`);

  const playStoreReviews = loadReviewsFromCsv(playStorePath);
  console.log(`Loaded ${playStoreReviews.length} Google Play Store reviews.`);

  const redditPosts = loadReviewsFromCsv(redditPostsPath);
  console.log(`Loaded ${redditPosts.length} Reddit posts.`);

  const rawCombined = [...appStoreReviews, ...playStoreReviews, ...redditPosts];
  console.log(`Combined count (before deduplication): ${rawCombined.length}`);

  // Deduplicate by text content (case insensitive, trimmed)
  const seen = new Set();
  const uniqueReviews = [];

  for (const item of rawCombined) {
    const normalizedText = item.text.trim().toLowerCase();
    if (!seen.has(normalizedText)) {
      seen.add(normalizedText);
      uniqueReviews.push(item);
    }
  }

  console.log(`Deduplicated count: ${uniqueReviews.length}`);

  // Write out merged data
  const header = 'id,source,date,rating,text,url\n';
  const rows = uniqueReviews.map(item => {
    return [
      escapeCsv(item.id),
      escapeCsv(item.source),
      escapeCsv(item.date),
      escapeCsv(item.rating),
      escapeCsv(item.text),
      escapeCsv(item.url)
    ].join(',');
  }).join('\n');

  fs.writeFileSync(allReviewsPath, header + rows, 'utf8');
  console.log(`Successfully merged reviews. Master list saved to: ${allReviewsPath}`);
}

main();

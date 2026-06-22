const fs = require('fs');
const path = require('path');

// Helper to escape CSV values
function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  let str = String(val).replace(/\r?\n|\r/g, ' ').replace(/"/g, '""');
  return `"${str}"`;
}

// Ensure raw data directory exists
const rawDataDir = path.join(__dirname, '..', 'data', 'raw');
if (!fs.existsSync(rawDataDir)) {
  fs.mkdirSync(rawDataDir, { recursive: true });
}

// 1. Fetch Apple App Store Reviews across multiple working storefronts
async function fetchAppStoreReviews() {
  console.log('Fetching Spotify App Store reviews...');
  const appId = '324684580'; // Spotify App ID
  const countries = ['in', 'gb', 'sg', 'se', 'nl', 'be', 'pt', 'vn'];
  const reviews = [];
  
  for (const country of countries) {
    try {
      console.log(`Querying App Store storefront: ${country}...`);
      const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${appId}/sortBy=mostRecent/json`;
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`  Failed to fetch reviews for ${country}: ${response.statusText}`);
        continue;
      }
      const data = await response.json();
      const entries = data.feed.entry;
      if (!entries || entries.length === 0) {
        console.log(`  No reviews found for ${country}.`);
        continue;
      }

      let count = 0;
      for (const entry of entries) {
        if (entry.id && entry.id.label) {
          const id = entry.id.label;
          const rating = entry['im:rating'] ? parseInt(entry['im:rating'].label, 10) : 0;
          const title = entry.title ? entry.title.label : '';
          const content = entry.content ? entry.content.label : '';
          const date = entry.updated ? entry.updated.label.split('T')[0] : '';
          
          const text = `${title} - ${content}`;
          const reviewUrl = `https://apps.apple.com/${country}/app/spotify-music-and-podcasts/id${appId}`;

          reviews.push({
            id,
            source: `app_store_${country}`,
            date,
            rating,
            text,
            url: reviewUrl
          });
          count++;
        }
      }
      console.log(`  ${country}: Collected ${count} reviews.`);
      // Sleep to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (err) {
      console.error(`  Error fetching App Store reviews for ${country}:`, err.message);
    }
  }

  // Filter App Store reviews for discovery keywords or low ratings (1-3 stars)
  const filteredReviews = reviews.filter(r => {
    const textLower = r.text.toLowerCase();
    const hasKeyword = textLower.includes('recommend') || 
                      textLower.includes('discover') || 
                      textLower.includes('repeat') || 
                      textLower.includes('same song') || 
                      textLower.includes('playlist') ||
                      textLower.includes('mix') ||
                      textLower.includes('dj');
    return r.rating <= 3 || hasKeyword;
  });

  console.log(`Collected ${filteredReviews.length} relevant App Store reviews (after filtering).`);
  return filteredReviews;
}

// 2. Fetch Google Play Store Reviews
async function fetchPlayStoreReviews() {
  console.log('Attempting to fetch Google Play Store reviews...');
  try {
    const gplay = require('google-play-scraper').default;
    
    // Fetch 1800 reviews to get plenty of data for our 800+ corpus goal
    const result = await gplay.reviews({
      appId: 'com.spotify.music',
      sort: gplay.sort.NEWEST,
      num: 1800,
      lang: 'en'
    });

    const reviews = result.data.map(item => {
      // Safe date handling: support both string dates and Date objects
      let dateStr = '';
      if (item.date) {
        if (typeof item.date === 'string') {
          dateStr = item.date;
        } else if (item.date instanceof Date) {
          dateStr = item.date.toISOString();
        } else if (typeof item.date.toISOString === 'function') {
          dateStr = item.date.toISOString();
        }
      }
      
      return {
        id: item.id,
        source: 'play_store',
        date: dateStr ? dateStr.split('T')[0] : '',
        rating: item.score,
        text: item.text,
        url: item.url
      };
    });

    const filtered = reviews.filter(r => {
      const textLower = r.text.toLowerCase();
      const hasKeyword = textLower.includes('recommend') || 
                        textLower.includes('discover') || 
                        textLower.includes('repeat') || 
                        textLower.includes('same song') || 
                        textLower.includes('playlist') ||
                        textLower.includes('mix') ||
                        textLower.includes('dj');
      return r.rating <= 3 || hasKeyword;
    });

    console.log(`Collected ${filtered.length} relevant Google Play Store reviews.`);
    return filtered;
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.warn('  google-play-scraper is not installed. Skipping Play Store reviews.');
    } else {
      console.error('  Error fetching Google Play reviews:', err.message);
    }
    return [];
  }
}

// Write arrays of items to a CSV file
function writeToCsv(filePath, data) {
  const header = 'id,source,date,rating,text,url\n';
  const rows = data.map(item => {
    return [
      escapeCsv(item.id),
      escapeCsv(item.source),
      escapeCsv(item.date),
      escapeCsv(item.rating),
      escapeCsv(item.text),
      escapeCsv(item.url)
    ].join(',');
  }).join('\n');

  fs.writeFileSync(filePath, header + rows, 'utf8');
  console.log(`Saved ${data.length} records to ${filePath}`);
}

async function main() {
  const appStoreReviews = await fetchAppStoreReviews();
  const playStoreReviews = await fetchPlayStoreReviews();

  if (appStoreReviews.length > 0) {
    writeToCsv(path.join(rawDataDir, 'app_store_reviews.csv'), appStoreReviews);
  }
  if (playStoreReviews.length > 0) {
    writeToCsv(path.join(rawDataDir, 'play_store_reviews.csv'), playStoreReviews);
  }

  // Deduplicate and combine all reviews into all_reviews.csv
  const allReviews = [...appStoreReviews, ...playStoreReviews];
  if (allReviews.length > 0) {
    const seenTexts = new Set();
    const uniqueReviews = [];
    for (const r of allReviews) {
      const normalizedText = r.text.trim().toLowerCase();
      if (!seenTexts.has(normalizedText)) {
        seenTexts.add(normalizedText);
        uniqueReviews.push(r);
      }
    }
    writeToCsv(path.join(rawDataDir, 'all_reviews.csv'), uniqueReviews);
    console.log(`Master file all_reviews.csv created with ${uniqueReviews.length} unique reviews.`);
  } else {
    console.warn('No reviews collected.');
  }
}

main();

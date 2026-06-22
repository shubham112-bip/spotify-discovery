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

function calculateStats() {
  const csvPath = path.join(__dirname, '..', 'data', 'analyzed', 'reviews_tagged.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV not found at ${csvPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const headers = parseCsvLine(lines[0].trim());

  console.log(`Headers detected: ${headers.join(', ')}`);

  let totalCount = 0;
  const sentiments = {};
  const barriers = {};
  const themesCount = {};
  const behaviors = {};
  const unmetNeeds = {};
  const exemplars = []; // To collect some high-quality quote exemplars

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCsvLine(line);
    // Expected structure: ID,Sentiment,Barrier Type,Themes,Listening Behaviour,Unmet Need,Summary Insight
    // Let's tolerate minor index issues.
    if (parts.length >= 7) {
      totalCount++;
      const id = parts[0].trim();
      const sentiment = parts[1].trim().toLowerCase();
      const barrier = parts[2].trim();
      const themesStr = parts[3].trim();
      const behavior = parts[4].trim();
      const unmet = parts[5].trim();
      const summary = parts[6].trim();

      // Sentiment
      sentiments[sentiment] = (sentiments[sentiment] || 0) + 1;

      // Barrier Type
      barriers[barrier] = (barriers[barrier] || 0) + 1;

      // Themes (split by comma, clean quotes)
      const cleanedThemes = themesStr.replace(/"/g, '').split(',');
      cleanedThemes.forEach(t => {
        const theme = t.trim();
        if (theme && theme !== 'Not specified') {
          themesCount[theme] = (themesCount[theme] || 0) + 1;
        }
      });

      // Listening Behavior
      if (behavior && behavior !== 'Not specified' && behavior !== 'None') {
        behaviors[behavior] = (behaviors[behavior] || 0) + 1;
      }

      // Unmet Need
      if (unmet && unmet !== 'Not specified' && unmet !== 'None') {
        unmetNeeds[unmet] = (unmetNeeds[unmet] || 0) + 1;
      }

      // Capture exemplars for each barrier type if we find some interesting ones
      if (exemplars.length < 25 && barrier !== 'None' && barrier !== 'Other') {
        exemplars.push({
          id,
          barrier,
          summary,
          sentiment
        });
      }
    }
  }

  const stats = {
    totalReviews: totalCount,
    sentimentDistribution: sentiments,
    barrierDistribution: barriers,
    topThemes: Object.entries(themesCount).sort((a, b) => b[1] - a[1]).slice(0, 15),
    topBehaviors: Object.entries(behaviors).sort((a, b) => b[1] - a[1]).slice(0, 10),
    topUnmetNeeds: Object.entries(unmetNeeds).sort((a, b) => b[1] - a[1]).slice(0, 10),
    exemplars: exemplars.slice(0, 15)
  };

  const outputPath = path.join(__dirname, '..', 'data', 'analyzed', 'summary_stats.json');
  fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2), 'utf8');

  console.log(`\n=== ANALYSIS COMPLETE ===`);
  console.log(`Total rows parsed: ${totalCount}`);
  console.log(`\nSentiment Distribution:`);
  Object.entries(sentiments).forEach(([k, v]) => {
    console.log(`  - ${k}: ${v} (${((v / totalCount) * 100).toFixed(1)}%)`);
  });

  console.log(`\nBarrier Distribution:`);
  Object.entries(barriers).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  - ${k}: ${v} (${((v / totalCount) * 100).toFixed(1)}%)`);
  });

  console.log(`\nTop 10 Themes:`);
  stats.topThemes.slice(0, 10).forEach(([k, v]) => {
    console.log(`  - ${k}: ${v}`);
  });

  console.log(`\nStats saved to ${outputPath}`);
}

calculateStats();

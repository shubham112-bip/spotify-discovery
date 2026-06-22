const fs = require('fs');
const path = require('path');

// 1. Helper to manually load .env file from root
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.substring(0, index).trim();
        let value = trimmed.substring(index + 1).trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

// Helper to escape CSV values (for CSV parser)
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

// 2. Load and parse raw reviews CSV
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
    if (parts.length >= 6) {
      reviews.push({
        id: parts[0],
        source: parts[1],
        date: parts[2],
        rating: parts[3],
        text: parts[4],
        url: parts[5]
      });
    }
  }
  return reviews;
}

// 3. Helper to clean and parse JSON from LLM response
function parseLlmJson(text) {
  try {
    // Attempt normal parsing
    return JSON.parse(text);
  } catch (e) {
    // If it fails, try to extract json substring (handles markdown fences ```json ... ```)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerError) {
        throw new Error(`Failed to parse extracted JSON: ${innerError.message}. Raw: ${text}`);
      }
    }
    throw new Error(`Failed to find JSON object in response: ${e.message}. Raw: ${text}`);
  }
}

// 4. API calling helper (Claude or OpenAI)
async function callLlm(promptText) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey) {
    // Anthropic API call using native fetch
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{ role: 'user', content: promptText }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text;
    }
    throw new Error('Malformed Anthropic response structure: ' + JSON.stringify(data));

  } else if (openaiKey) {
    // OpenAI API call using native fetch
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: promptText }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      return data.choices[0].message.content;
    }
    throw new Error('Malformed OpenAI response structure: ' + JSON.stringify(data));

  } else {
    throw new Error('Missing LLM API credentials. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY in your .env file.');
  }
}

// 5. Main pipeline execution
async function main() {
  const rawReviewsPath = path.join(__dirname, '..', 'data', 'raw', 'all_reviews.csv');
  const promptPath = path.join(__dirname, 'prompts', 'extract_review.txt');
  
  const analyzedDir = path.join(__dirname, '..', 'data', 'analyzed');
  if (!fs.existsSync(analyzedDir)) {
    fs.mkdirSync(analyzedDir, { recursive: true });
  }
  const outputPath = path.join(analyzedDir, 'reviews_tagged.json');

  // Load target reviews
  const allReviews = loadReviewsFromCsv(rawReviewsPath);
  console.log(`Loaded ${allReviews.length} total reviews to process.`);

  // Load LLM Prompt template
  if (!fs.existsSync(promptPath)) {
    console.error(`Prompt template not found at ${promptPath}`);
    process.exit(1);
  }
  const basePrompt = fs.readFileSync(promptPath, 'utf8');

  // Load existing checkpoint progress
  let taggedReviews = [];
  const taggedMap = new Map();
  if (fs.existsSync(outputPath)) {
    try {
      const fileContent = fs.readFileSync(outputPath, 'utf8');
      if (fileContent.trim()) {
        taggedReviews = JSON.parse(fileContent);
        taggedReviews.forEach(r => taggedMap.set(r.id, r));
        console.log(`Found checkpoint: ${taggedReviews.length} reviews already tagged.`);
      }
    } catch (err) {
      console.warn(`Failed to parse checkpoint file ${outputPath}:`, err.message);
      console.log('Starting analysis from scratch.');
    }
  }

  // Filter reviews that haven't been processed yet
  const reviewsToProcess = allReviews.filter(r => !taggedMap.has(r.id));
  console.log(`${reviewsToProcess.length} reviews remaining to process.`);

  if (reviewsToProcess.length === 0) {
    console.log('All reviews are already tagged! Exiting.');
    process.exit(0);
  }

  // Support batching (limit CLI run parameters if specified)
  const batchSize = 20;
  // Read optional command line arguments: node analyze_reviews.js [max_reviews_to_process]
  const maxToProcessArg = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  const processLimit = maxToProcessArg || reviewsToProcess.length;
  const activeReviewsList = reviewsToProcess.slice(0, processLimit);

  console.log(`Starting run for up to ${activeReviewsList.length} reviews in batches of ${batchSize}...`);

  for (let i = 0; i < activeReviewsList.length; i += batchSize) {
    const batch = activeReviewsList.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(activeReviewsList.length / batchSize)} (Reviews ${i + 1} - ${Math.min(i + batchSize, activeReviewsList.length)})...`);

    // Format batch inputs
    let batchInputText = '';
    batch.forEach(item => {
      batchInputText += `ID: ${item.id}\nText: ${item.text}\n---\n`;
    });

    const fullPrompt = `${basePrompt}\n${batchInputText}`;

    let success = false;
    let retries = 3;
    let resultJson = null;

    while (!success && retries > 0) {
      try {
        const rawResponse = await callLlm(fullPrompt);
        resultJson = parseLlmJson(rawResponse);
        if (resultJson && Array.isArray(resultJson.results)) {
          success = true;
        } else {
          throw new Error('LLM did not return the expected JSON format with a "results" array.');
        }
      } catch (err) {
        retries--;
        console.warn(`  Batch failed. Error: ${err.message}. Retries left: ${retries}`);
        if (retries > 0) {
          console.log('  Waiting 5 seconds before retrying...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    if (!success) {
      console.error('CRITICAL: Batch failed repeatedly. Saving progress and stopping execution.');
      break;
    }

    // Process and enrich batch results
    const resultsMap = new Map();
    resultJson.results.forEach(res => {
      resultsMap.set(res.id, res);
    });

    batch.forEach(original => {
      const analysis = resultsMap.get(original.id);
      if (analysis) {
        taggedReviews.push({
          id: original.id,
          source: original.source,
          date: original.date,
          rating: original.rating ? parseInt(original.rating, 10) : null,
          text: original.text,
          url: original.url,
          sentiment: analysis.sentiment,
          barrier_type: analysis.barrier_type,
          themes: analysis.themes,
          listening_behavior: analysis.listening_behavior,
          unmet_need: analysis.unmet_need,
          summary_insight: analysis.summary_insight
        });
      } else {
        // Fallback placeholder if LLM skipped/missed a specific ID in the batch
        taggedReviews.push({
          id: original.id,
          source: original.source,
          date: original.date,
          rating: original.rating ? parseInt(original.rating, 10) : null,
          text: original.text,
          url: original.url,
          sentiment: 'neutral',
          barrier_type: 'Other',
          themes: [],
          listening_behavior: 'Not specified',
          unmet_need: 'Not specified',
          summary_insight: 'LLM failed to output analysis for this record.'
        });
      }
    });

    // Save checkpoint progress
    fs.writeFileSync(outputPath, JSON.stringify(taggedReviews, null, 2), 'utf8');
    console.log(`  Saved checkpoint. Total tagged reviews: ${taggedReviews.length}`);

    // Wait a brief moment to avoid API rate limits
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log(`\nReview analysis pipeline run completed! Results saved to: ${outputPath}`);
}

main().catch(err => {
  console.error('Pipeline crashed:', err);
  process.exit(1);
});

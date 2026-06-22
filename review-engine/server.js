const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const CSV_PATH = path.join(__dirname, '..', 'data', 'analyzed', 'reviews_tagged.csv');

// Helper to parse CSV lines (handles commas and quotes)
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

const RAW_CSV_PATH = path.join(__dirname, '..', 'data', 'raw', 'all_reviews.csv');

// Function to convert CSV to JSON array and merge with raw data
function parseCsvToJson() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV file not found at: ${CSV_PATH}`);
    return [];
  }

  // 1. Build a map of raw reviews (ID -> { text, rating, date, source, url })
  const rawMap = new Map();
  if (fs.existsSync(RAW_CSV_PATH)) {
    const rawContent = fs.readFileSync(RAW_CSV_PATH, 'utf8');
    const rawLines = rawContent.split(/\r?\n/);
    if (rawLines.length >= 2) {
      const rawHeaders = parseCsvLine(rawLines[0].trim()).map(h => h.trim().toLowerCase());
      for (let i = 1; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) continue;
        const parts = parseCsvLine(line);
        const row = {};
        rawHeaders.forEach((h, idx) => {
          row[h] = parts[idx] ? parts[idx].trim() : '';
        });
        const id = row.id;
        if (id) {
          rawMap.set(id, row);
        }
      }
    }
  } else {
    console.warn(`Warning: Raw reviews CSV not found at ${RAW_CSV_PATH}`);
  }

  // 2. Parse the tagged reviews CSV
  const fileContent = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = fileContent.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0].trim()).map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCsvLine(line);
    const rowObj = {};
    headers.forEach((header, idx) => {
      rowObj[header] = parts[idx] ? parts[idx].trim() : '';
    });

    const id = rowObj.ID || rowObj.id;
    if (id) {
      const rawMatch = rawMap.get(id) || {};
      
      // Standardize response keys to clean lowercase
      data.push({
        id: id,
        source: rawMatch.source || 'Unknown',
        date: rawMatch.date || '',
        rating: rawMatch.rating || '',
        text: rawMatch.text || '',
        url: rawMatch.url || '',
        sentiment: (rowObj.Sentiement || rowObj.Sentiment || rowObj.sentiment || 'neutral').toLowerCase(),
        barrier_type: rowObj['Barrier Type'] || rowObj.barrier_type || 'None',
        themes: rowObj.Themes || rowObj.themes || '',
        listening_behavior: rowObj['Listening Behaviour '] || rowObj.listening_behavior || '',
        unmet_need: rowObj['Unmet Need '] || rowObj.unmet_need || '',
        summary_insight: rowObj['Summary Insight'] || rowObj.summary_insight || ''
      });
    }
  }

  return data;
}

// HTTP Server Logic
const server = http.createServer((req, res) => {
  const url = req.url;

  // API Endpoint: /api/reviews
  if (url === '/api/reviews') {
    try {
      const jsonReviews = parseCsvToJson();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(jsonReviews));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read or parse reviews CSV.', details: err.message }));
    }
    return;
  }

  // Static File Router
  let filePath = path.join(__dirname, url === '/' ? 'index.html' : url);
  
  // Safe directory check to prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  const extname = path.extname(filePath);
  let contentType = 'text/html';

  switch (extname) {
    case '.js':
      contentType = 'application/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
    case '.svg':
      contentType = 'image/svg+xml';
      break;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 File Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Review Engine Dashboard running at http://localhost:${PORT}/`);
  console.log(`API endpoint available at http://localhost:${PORT}/api/reviews`);
});

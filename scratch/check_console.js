const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\a8af5471-ef32-4cbf-99f1-e3eeb52f5d58\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(transcriptPath)) {
  console.error("Transcript file not found.");
  process.exit(1);
}

const content = fs.readFileSync(transcriptPath, 'utf8');
const lines = content.split('\n');

console.log("Searching for SYSTEM responses to console logs capture...");
for (let i = lines.length - 1; i >= 0; i--) {
  const line = lines[i].trim();
  if (!line) continue;
  
  if (line.includes('"type":"CAPTURE_BROWSER_CONSOLE_LOGS"') && line.includes('"source":"SYSTEM"')) {
    console.log(`\n=== Found Console Log Response (Index ${i}) ===`);
    try {
      const parsed = JSON.parse(line);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log("Raw line: ", line.slice(0, 1000));
    }
  }
}

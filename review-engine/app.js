// Global Data State
let allReviews = [];
let filteredReviews = [];

// DOM Elements
const elTotalCount = document.getElementById('stat-total-count');
const elNegPercent = document.getElementById('stat-neg-percent');
const elNegProgress = document.getElementById('neg-progress');
const elBarrierCount = document.getElementById('stat-barrier-count');
const elMatchingCount = document.getElementById('matching-count');
const elReviewsGrid = document.getElementById('reviews-grid');
const elSearchInput = document.getElementById('search-input');
const elFilterSentiment = document.getElementById('filter-sentiment');
const elFilterBarrier = document.getElementById('filter-barrier');
const elBtnReset = document.getElementById('btn-reset-filters');

// API Key Elements
const elGeminiKeyInput = document.getElementById('gemini-key');
const elBtnSaveKey = document.getElementById('btn-save-key');

// AI Elements
const elAiPromptInput = document.getElementById('ai-prompt-input');
const elBtnAskAi = document.getElementById('btn-ask-ai');
const elAiResponseBox = document.getElementById('ai-response-box');
const elContextInfo = document.getElementById('context-info');

// Initial Load & Event Listeners
window.addEventListener('DOMContentLoaded', () => {
  loadSavedApiKey();
  fetchReviews();

  // Event Listeners
  elFilterSentiment.addEventListener('change', filterDataset);
  elFilterBarrier.addEventListener('change', filterDataset);
  elSearchInput.addEventListener('input', filterDataset);
  elBtnReset.addEventListener('click', resetFilters);
  
  elBtnSaveKey.addEventListener('click', saveApiKey);
  elBtnAskAi.addEventListener('click', askGemini);
  elAiPromptInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') askGemini();
  });
});

// API Key Local Storage Management
function loadSavedApiKey() {
  const savedKey = localStorage.getItem('gemini_api_key');
  if (savedKey) {
    elGeminiKeyInput.value = savedKey;
    elGeminiKeyInput.classList.add('saved');
    elBtnSaveKey.textContent = 'Saved!';
    elBtnSaveKey.style.backgroundColor = 'var(--color-spotify)';
    loadAvailableModels();
  }
}

function saveApiKey() {
  const key = elGeminiKeyInput.value.trim();
  if (key) {
    localStorage.setItem('gemini_api_key', key);
    elBtnSaveKey.textContent = 'Saved!';
    elBtnSaveKey.style.backgroundColor = 'var(--color-spotify)';
    alert('API key stored securely in your browser local storage.');
    loadAvailableModels();
  } else {
    localStorage.removeItem('gemini_api_key');
    elBtnSaveKey.textContent = 'Save Key';
    elBtnSaveKey.style.backgroundColor = '';
  }
}

// Fetch available models from Google AI Studio dynamically
async function loadAvailableModels() {
  const apiKey = elGeminiKeyInput.value.trim();
  const selectEl = document.getElementById('ai-model-select');
  if (!apiKey || !selectEl) return;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.models && data.models.length > 0) {
      // Filter models that support generateContent
      const generateModels = data.models.filter(m => 
        m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
      );

      if (generateModels.length > 0) {
        // Clear previous options
        selectEl.innerHTML = '';
        generateModels.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.name; // e.g. "models/gemini-1.5-flash"
          opt.textContent = m.displayName || m.name.replace('models/', '');
          selectEl.appendChild(opt);
        });
        
        // Auto-select a flash model if available, prioritizing gemini-1.5-flash
        const flashOpt = Array.from(selectEl.options).find(o => o.value.includes('gemini-1.5-flash'));
        if (flashOpt) {
          selectEl.value = flashOpt.value;
        } else {
          const genericFlashOpt = Array.from(selectEl.options).find(o => o.value.toLowerCase().includes('flash'));
          if (genericFlashOpt) {
            selectEl.value = genericFlashOpt.value;
          }
        }
      }
    }
  } catch (error) {
    console.warn("Failed to load models list from Gemini API:", error);
  }
}

// Fetch CSV Data transformed to JSON from API Server
async function fetchReviews() {
  try {
    const response = await fetch('/api/reviews');
    if (!response.ok) {
      throw new Error(`Failed to load dataset: ${response.status} ${response.statusText}`);
    }
    allReviews = await response.json();
    filteredReviews = [...allReviews];
    
    // Initial Render
    calculateGlobalStats();
    filterDataset();
  } catch (error) {
    console.error(error);
    elReviewsGrid.innerHTML = `
      <div class="error-state">
        <svg style="width: 48px; height: 48px; color: var(--sentiment-neg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>Could not connect to the API Server. Make sure node server.js is running.</p>
        <p style="font-size: 12px; color: var(--text-muted);">${error.message}</p>
      </div>
    `;
  }
}

// Calculate Global Metrics
function calculateGlobalStats() {
  const total = allReviews.length;
  elTotalCount.textContent = total.toLocaleString();

  // Negative Sentiment Count
  const negativeReviews = allReviews.filter(r => {
    const sent = (r.sentiment || r.Sentiment || '').toLowerCase();
    return sent === 'negative';
  });
  const negPercent = total > 0 ? (negativeReviews.length / total) * 100 : 0;
  elNegPercent.textContent = `${negPercent.toFixed(1)}%`;
  elNegProgress.style.width = `${negPercent}%`;
}

// Filter dataset dynamically based on UI inputs
function filterDataset() {
  const sentimentFilter = elFilterSentiment.value.toLowerCase();
  const barrierFilter = elFilterBarrier.value;
  const searchKeyword = elSearchInput.value.trim().toLowerCase();

  filteredReviews = allReviews.filter(r => {
    // 1. Sentiment Match
    const sent = (r.sentiment || r.Sentiment || '').toLowerCase();
    const matchesSentiment = (sentimentFilter === 'all') || (sent === sentimentFilter);

    // 2. Barrier Match
    const barrier = r.barrier_type || r['Barrier Type'] || '';
    const matchesBarrier = (barrierFilter === 'all') || (barrier === barrierFilter);

    // 3. Keyword Match
    const reviewText = (r.text || r.Text || '').toLowerCase();
    const insightText = (r.summary_insight || r['Summary Insight'] || '').toLowerCase();
    const idText = (r.id || r.ID || '').toLowerCase();
    const themesText = (r.themes || r.Themes || '').toLowerCase();
    
    const matchesSearch = !searchKeyword || 
      reviewText.includes(searchKeyword) ||
      insightText.includes(searchKeyword) ||
      idText.includes(searchKeyword) ||
      themesText.includes(searchKeyword);

    return matchesSentiment && matchesBarrier && matchesSearch;
  });

  // Calculate current counts
  elMatchingCount.textContent = filteredReviews.length;
  
  // Calculate active frustrations (barriers that are NOT 'None')
  const activeFrustrations = filteredReviews.filter(r => {
    const b = r.barrier_type || r['Barrier Type'] || 'None';
    return b !== 'None';
  }).length;
  elBarrierCount.textContent = activeFrustrations.toLocaleString();
  elContextInfo.textContent = `Using ${Math.min(filteredReviews.length, 30)} reviews as context`;

  renderReviews();
}

// Reset Filter Inputs
function resetFilters() {
  elFilterSentiment.value = 'all';
  elFilterBarrier.value = 'all';
  elSearchInput.value = '';
  filterDataset();
}

// Helper to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Highlight keyword text
function highlightText(text, keyword) {
  if (!text) return '';
  if (!keyword) return text;
  try {
    const escapedKeyword = escapeRegExp(keyword);
    const regex = new RegExp(`(${escapKeyword})`, 'gi');
    return String(text).replace(regex, '<span class="highlight">$1</span>');
  } catch (e) {
    console.error("Error in highlightText:", e);
    return text;
  }
}

// Render dynamic review cards grid
function renderReviews() {
  try {
    if (filteredReviews.length === 0) {
      elReviewsGrid.innerHTML = `
        <div class="empty-state">
          <svg style="width: 48px; height: 48px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>No matching reviews found. Try resetting your filters.</p>
        </div>
      `;
      return;
    }

    const keyword = elSearchInput.value.trim();
    let html = '';

    filteredReviews.forEach(r => {
      const id = r.id || r.ID || 'N/A';
      const source = r.source || r.Source || 'Unknown';
      const sentiment = (r.sentiment || r.Sentiment || 'neutral').toLowerCase();
      const barrier = r.barrier_type || r['Barrier Type'] || 'None';
      const themes = r.themes || r.Themes || '';
      const text = r.text || r.Text || '';
      const insight = r.summary_insight || r['Summary Insight'] || 'No synthesis insight generated.';

      const highlightedText = highlightText(text, keyword);
      const highlightedInsight = highlightText(insight, keyword);

      html += `
        <div class="review-card">
          <div class="card-top">
            <div class="card-meta">
              <span class="card-source">${source}</span>
              <span class="card-id">#${id}</span>
            </div>
            <div class="badges-row">
              <span class="badge sentiment-${sentiment}">${sentiment}</span>
              <span class="badge barrier">${barrier}</span>
            </div>
          </div>
          <p class="card-text" onclick="toggleExpand(this)">${highlightedText}</p>
          <div class="card-insight">
            <span class="insight-label">AI Summary Insight:</span>
            <span>${highlightedInsight}</span>
            ${themes && themes !== 'Not specified' ? `<span style="font-size:11px; margin-top:4px; color:var(--text-muted);">Themes: ${themes}</span>` : ''}
          </div>
        </div>
      `;
    });

    elReviewsGrid.innerHTML = html;
  } catch (error) {
    console.error("Error in renderReviews:", error);
    elReviewsGrid.innerHTML = `
      <div class="error-state">
        <p>Error rendering reviews list: ${error.message}</p>
      </div>
    `;
  }
}

// Toggle Expand Card Text
window.toggleExpand = function(el) {
  el.classList.toggle('expanded');
};

// Connect Gemini Pro API through direct Client Fetch
async function askGemini() {
  const apiKey = elGeminiKeyInput.value.trim();
  const prompt = elAiPromptInput.value.trim();

  if (!apiKey) {
    alert('Please enter your free Google AI Studio API Key in the top right to query Gemini.');
    return;
  }
  if (!prompt) {
    alert('Please enter a question to ask Gemini.');
    return;
  }

  // Set loading state
  elBtnAskAi.disabled = true;
  elBtnAskAi.textContent = 'Thinking...';
  elAiResponseBox.innerHTML = `
    <div class="thinking">
      🤖 Gemini is synthesizing ${Math.min(filteredReviews.length, 30)} reviews to answer your question. Please wait...
    </div>
  `;

  // Grab the first 30 relevant reviews as context
  const contextReviews = filteredReviews.slice(0, 30);
  let contextText = '';
  contextReviews.forEach((item, index) => {
    contextText += `Review #${index + 1} (ID: ${item.id})\n`;
    contextText += `Sentiment: ${item.sentiment}\n`;
    contextText += `Frustration Barrier: ${item.barrier_type}\n`;
    contextText += `Insight Summary: ${item.summary_insight}\n`;
    contextText += `Content: ${item.text}\n`;
    contextText += `---\n`;
  });

  const fullPromptText = `You are a Senior Product Research Lead analyzing Spotify user reviews to prepare our commute music MVP called "Commute Compass". 
We have filtered down a dataset to the following reviews:

=== CONTEXT REVIEWS ===
${contextText}
=======================

Using ONLY the provided reviews as context, answer this user question:
"${prompt}"

Structure your response:
1. Provide a direct, data-backed synthesis of the users' complaints.
2. Back it up by quoting/referencing the specific Review IDs where relevant.
3. Keep the tone professional, analytical, and product-focused.
If the reviews do not provide enough context to answer the question, state that clearly.`;

  const selectedModel = document.getElementById('ai-model-select').value;
  const modelPath = selectedModel.startsWith('models/') ? selectedModel : `models/${selectedModel}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: fullPromptText }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const textOutput = data.candidates[0].content.parts[0].text;

    // Render answer
    elAiResponseBox.innerHTML = `<div class="ai-response-content">${formatMarkdownText(textOutput)}</div>`;
  } catch (error) {
    console.error(error);
    elAiResponseBox.innerHTML = `
      <div style="color: var(--sentiment-neg); font-weight: 500;">
        ⚠️ Error querying Gemini API. Check your API key and connection.
        <p style="font-size: 11px; margin-top: 8px; font-weight: 400; color: var(--text-muted);">${error.message}</p>
      </div>
    `;
  } finally {
    elBtnAskAi.disabled = false;
    elBtnAskAi.textContent = 'Ask AI';
  }
}

// Basic formatter to render bold, list, and linebreaks from markdown response
function formatMarkdownText(text) {
  // Simple paragraph conversions
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*?)$/gm, '• $1')
    .replace(/^### (.*?)$/gm, '<h3 style="font-size: 15px; margin-top: 12px; margin-bottom: 6px; color: var(--color-spotify);">$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2 style="font-size: 16px; margin-top: 14px; margin-bottom: 8px; color: var(--color-accent-hover);">$1</h2>');
  return formatted;
}

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const authScreen = document.getElementById('authScreen');
  const formScreen = document.getElementById('formScreen');
  const loadingScreen = document.getElementById('loadingScreen');
  const resultsScreen = document.getElementById('resultsScreen');

  const connectSpotifyBtn = document.getElementById('connectSpotifyBtn');
  const userBadge = document.getElementById('userBadge');
  const userNameText = document.getElementById('userNameText');
  const logoutBtn = document.getElementById('logoutBtn');

  const vibeForm = document.getElementById('vibeForm');
  const adventureSlider = document.getElementById('adventureSlider');
  const adventureValue = document.getElementById('adventureValue');
  const preferredTasteInput = document.getElementById('preferredTaste');
  
  const apiToggleBtn = document.getElementById('apiToggleBtn');
  const apiContent = document.getElementById('apiContent');
  const geminiApiKeyInput = document.getElementById('geminiApiKey');
  const geminiModelSelect = document.getElementById('geminiModel');

  const loaderMessage = document.getElementById('loaderMessage');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const step4 = document.getElementById('step4');

  const sessionTitle = document.getElementById('sessionTitle');
  const explanationOverview = document.getElementById('explanationOverview');
  const openPlaylistBtn = document.getElementById('openPlaylistBtn');
  const tracksList = document.getElementById('tracksList');
  
  const regenerateBtn = document.getElementById('regenerateBtn');

  // App State Variables
  let config = { clientId: '', redirectUri: '' };
  let spotifyToken = null;

  // 1. Fetch Spotify Configuration from Backend
  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        config = await res.json();
      } else {
        console.error('Failed to load Spotify configuration');
      }
    } catch (err) {
      console.error('Error loading configuration:', err);
    }
  }

  // 2. Manage Spotify Authentication
  async function checkSpotifyAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      // Show intermediate status and exchange code
      showScreen(loadingScreen);
      loaderMessage.textContent = 'Connecting to Spotify...';
      await exchangeCodeForToken(code);
    } else {
      spotifyToken = sessionStorage.getItem('spotify_access_token');
      if (spotifyToken) {
        showScreen(formScreen);
        userBadge.style.display = 'flex';
        fetchUserProfile();
      } else {
        showScreen(authScreen);
        userBadge.style.display = 'none';
      }
    }
  }

  // Exchange Auth Code for Access Token on Backend
  async function exchangeCodeForToken(code) {
    try {
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (res.ok) {
        const data = await res.json();
        spotifyToken = data.access_token;
        sessionStorage.setItem('spotify_access_token', spotifyToken);
        
        // Clean url query parameters
        history.pushState('', document.title, window.location.pathname);
        
        showScreen(formScreen);
        userBadge.style.display = 'flex';
        fetchUserProfile();
      } else {
        const errText = await res.text();
        console.error('Failed code exchange:', errText);
        alert('Spotify Connection Failed. Please try connecting again.');
        showScreen(authScreen);
      }
    } catch (err) {
      console.error('Error during code exchange:', err);
      alert('Network error connecting to Spotify.');
      showScreen(authScreen);
    }
  }

  // Fetch Spotify User name to display in header
  async function fetchUserProfile() {
    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${spotifyToken}` }
      });
      if (res.ok) {
        const profile = await res.json();
        userNameText.textContent = profile.display_name || profile.id;
      }
    } catch (err) {
      console.warn('Could not load user profile', err);
    }
  }

  // Redirect to Spotify Auth Screen
  connectSpotifyBtn.addEventListener('click', async () => {
    if (!config.clientId) {
      await loadConfig();
    }
    
    const scopes = 'user-top-read playlist-modify-public playlist-modify-private';
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${config.clientId}&response_type=code&redirect_uri=${encodeURIComponent(config.redirectUri)}&scope=${encodeURIComponent(scopes)}&show_dialog=true`;
    window.location.href = authUrl;
  });

  // Disconnect/Logout action
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('spotify_access_token');
    window.location.reload();
  });

  // 3. UI Event Handlers
  // Sync slider label
  const adventureTexts = {
    1: '1 (Familiar Comfort)',
    2: '2 (Low Risk)',
    3: '3 (Balanced Vibe)',
    4: '4 (Active Exploration)',
    5: '5 (Uncharted Discovery)'
  };
  adventureSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    adventureValue.textContent = adventureTexts[val] || val;
  });

  // Collapsible toggle for settings
  apiToggleBtn.addEventListener('click', () => {
    apiToggleBtn.classList.toggle('open');
    apiContent.classList.toggle('show');
  });

  // Fetch available models from Google AI Studio dynamically
  async function loadAvailableModels() {
    const apiKey = geminiApiKeyInput.value.trim();
    if (!apiKey) return;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.models && data.models.length > 0) {
        // Filter models that support generateContent
        const generateModels = data.models.filter(m => 
          m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
        );

        if (generateModels.length > 0) {
          // Clear previous options
          geminiModelSelect.innerHTML = '';
          generateModels.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.name; // e.g. "models/gemini-1.5-flash"
            opt.textContent = m.displayName || m.name.replace('models/', '');
            geminiModelSelect.appendChild(opt);
          });
          
          // Auto-select a flash model if available, prioritizing gemini-1.5-flash
          const flashOpt = Array.from(geminiModelSelect.options).find(o => o.value.includes('gemini-1.5-flash'));
          if (flashOpt) {
            geminiModelSelect.value = flashOpt.value;
          } else {
            const genericFlashOpt = Array.from(geminiModelSelect.options).find(o => o.value.toLowerCase().includes('flash'));
            if (genericFlashOpt) {
              geminiModelSelect.value = genericFlashOpt.value;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Could not load models dynamically:', err);
    }
  }

  // Manage loaded Gemini API Key
  const storedKey = localStorage.getItem('gemini_api_key');
  if (storedKey) {
    geminiApiKeyInput.value = storedKey;
    loadAvailableModels();
  }
  geminiApiKeyInput.addEventListener('input', (e) => {
    localStorage.setItem('gemini_api_key', e.target.value);
    loadAvailableModels();
  });

  // Helper function to handle screen swaps
  function showScreen(screen) {
    [authScreen, formScreen, loadingScreen, resultsScreen].forEach(s => {
      s.classList.remove('active');
    });
    screen.classList.add('active');
  }

  // 4. Form Submission and Orchestration Lifecycle
  vibeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const duration = document.querySelector('input[name="duration"]:checked').value;
    const mood = document.querySelector('input[name="mood"]:checked').value;
    const adventure = adventureSlider.value;
    const userApiKey = geminiApiKeyInput.value.trim();
    const geminiModel = geminiModelSelect.value;
    const preferredTaste = preferredTasteInput.value.trim();

    // Trigger Loading Screen
    showScreen(loadingScreen);
    resetLoadingSteps();

    // Visual sequence mock for the Curation Agent Steps
    setTimeout(() => advanceStep(step1, 'Consulting Gemini Curation Model...'), 1800);
    setTimeout(() => advanceStep(step2, 'Searching Spotify Catalog...'), 4200);
    setTimeout(() => advanceStep(step3, 'Instantiating Playlist...'), 6500);

    try {
      const response = await fetch('/api/generate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotify_access_token: spotifyToken,
          gemini_api_key: userApiKey || null,
          gemini_model: geminiModel,
          preferred_taste: preferredTaste || null,
          mood,
          duration,
          adventure
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server curation error');
      }

      const sessionData = await response.json();
      
      // Advance final step
      advanceStep(step4, 'Complete!');
      setTimeout(() => {
        renderResults(sessionData);
        showScreen(resultsScreen);
      }, 1000);

    } catch (err) {
      console.error(err);
      alert(`Compass Curation Failed: ${err.message}`);
      showScreen(formScreen);
    }
  });

  // Loader Visual Steps Controllers
  function resetLoadingSteps() {
    loaderMessage.textContent = 'Reading your Spotify taste profile...';
    [step1, step2, step3, step4].forEach(step => {
      step.className = 'step-row';
    });
    step1.classList.add('active');
  }

  function advanceStep(currentStep, nextMsg) {
    currentStep.classList.remove('active');
    currentStep.classList.add('done');
    
    loaderMessage.textContent = nextMsg;
    const nextStep = currentStep.nextElementSibling;
    if (nextStep && nextStep.classList.contains('step-row')) {
      nextStep.classList.add('active');
    }
  }

  // 5. Render Results Screen
  function renderResults(data) {
    sessionTitle.textContent = data.sessionTitle;
    explanationOverview.textContent = data.explanationOverview;
    
    if (data.playlistUrl) {
      openPlaylistBtn.href = data.playlistUrl;
      openPlaylistBtn.style.display = 'inline-flex';
    } else {
      openPlaylistBtn.style.display = 'none';
    }

    tracksList.innerHTML = '';
    
    data.tracks.forEach(track => {
      const card = document.createElement('div');
      card.className = 'track-card';
      
      const cardTop = document.createElement('div');
      cardTop.className = 'card-top';
      
      const trackMeta = document.createElement('div');
      trackMeta.className = 'track-meta';
      
      const trackName = document.createElement('h3');
      trackName.className = 'track-name';
      trackName.textContent = track.song;
      
      const trackArtist = document.createElement('span');
      trackArtist.className = 'track-artist';
      trackArtist.textContent = track.artist;
      
      trackMeta.appendChild(trackName);
      trackMeta.appendChild(trackArtist);
      
      const phaseTag = document.createElement('span');
      phaseTag.className = `phase-tag ${track.phase}`;
      phaseTag.textContent = track.phase;
      
      cardTop.appendChild(trackMeta);
      cardTop.appendChild(phaseTag);
      
      const cardExplanation = document.createElement('p');
      cardExplanation.className = `card-explanation ${track.phase}`;
      cardExplanation.textContent = track.why;
      
      card.appendChild(cardTop);
      card.appendChild(cardExplanation);
      
      if (track.externalUrl) {
        const playAnchor = document.createElement('a');
        playAnchor.className = 'play-anchor';
        playAnchor.href = track.externalUrl;
        playAnchor.target = '_blank';
        playAnchor.title = 'Listen on Spotify';
        playAnchor.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        `;
        card.appendChild(playAnchor);
      } else {
        const unmatched = document.createElement('span');
        unmatched.className = 'unmatched-label';
        unmatched.textContent = '⚠️ Text Only (Unmatched)';
        card.appendChild(unmatched);
      }
      
      tracksList.appendChild(card);
    });
  }

  // Regenerate/New Commute action
  regenerateBtn.addEventListener('click', () => {
    showScreen(formScreen);
  });

  // 6. Application Initialization
  async function init() {
    await loadConfig();
    checkSpotifyAuth();
  }

  init();
});

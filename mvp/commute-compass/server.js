require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Parse JSON request bodies
app.use(express.json());

// Serve static files from public/ directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to return Spotify Config (Client ID and Redirect URI) to client
app.get('/api/config', (req, res) => {
  res.json({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3001/'
  });
});

// API endpoint to exchange Spotify Auth Code for Access Token
app.post('/api/auth/token', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Missing auth code' });
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3001/';

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    if (tokenRes.ok) {
      const tokenData = await tokenRes.json();
      res.json(tokenData);
    } else {
      const errText = await tokenRes.text();
      res.status(tokenRes.status).json({ error: `Spotify token exchange error: ${errText}` });
    }
  } catch (err) {
    console.error('[Token Exchange Error]', err);
    res.status(500).json({ error: 'Internal server error during token exchange' });
  }
});

// Helper to get Spotify client credentials token (for guest/demo mode searches)
async function getClientCredentialsToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in backend configuration.');
  }
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials'
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to retrieve client credentials token: ${text}`);
  }
  const data = await response.json();
  return data.access_token;
}

// Mock Curation Session fallback generator for rate-limited/keyless demo modes
function getMockSession(mood, preferredTaste) {
  let title = "Commute Compass: Dynamic Session";
  let explanation = "This session was generated using pre-curated tracks because the Gemini API is currently rate-limited on the free tier.";
  let tracks = [];

  const tasteLower = (preferredTaste || '').toLowerCase();
  const moodVal = (mood || 'calm').toLowerCase();
  
  if (tasteLower.includes('hindi') || tasteLower.includes('bollywood') || tasteLower.includes('arijit') || tasteLower.includes('diljit') || tasteLower.includes('punjabi') || tasteLower.includes('ar rahman') || tasteLower.includes('pritam')) {
    title = `Bollywood & Hindi Vibe: ${moodVal.toUpperCase()} Commute`;
    explanation = `Demo Mode Fallback: Selected highly rated Hindi, Punjabi, and Bollywood tracks matching your ${moodVal} mood (Gemini API quota exceeded).`;
    tracks = [
      { song: "Kesariya", artist: "Arijit Singh", phase: "warmup", why: "A comforting and melodic track by Arijit Singh to ease you into your commute." },
      { song: "Lover", artist: "Diljit Dosanjh", phase: "warmup", why: "An upbeat Punjabi pop track to lift your spirits and set a bright tone." },
      { song: "Kun Faya Kun", artist: "A.R. Rahman", phase: "discovery", why: "A soulful Sufi masterpiece by A.R. Rahman, offering deep focus and immersion." },
      { song: "Pasoori", artist: "Ali Sethi", phase: "discovery", why: "A modern classic blending indie folk and pop elements, great for discovery." },
      { song: "Tum Se Hi", artist: "Pritam", phase: "discovery", why: "A nostalgic melody that matches a relaxed, flowing commute vibe." },
      { song: "Kabira", artist: "Pritam", phase: "discovery", why: "An acoustic folk-pop favorite to accompany your scenic window views." },
      { song: "O Bedardeya", artist: "Arijit Singh", phase: "fallback", why: "A heavy, emotional ballad to close the session with deep vocals." },
      { song: "Agar Tum Saath Ho", artist: "Alka Yagnik", phase: "fallback", why: "A beautiful acoustic duet that leaves a lasting, soothing impression." }
    ];
  } else {
    // English / Global Pop Lofi fallback
    title = `Lofi & Acoustic: ${moodVal.toUpperCase()} Commute`;
    explanation = `Demo Mode Fallback: Selected popular global acoustic and lofi tracks matching your ${moodVal} mood (Gemini API quota exceeded).`;
    tracks = [
      { song: "Blinding Lights", artist: "The Weeknd", phase: "warmup", why: "A synth-pop anthem to bring energy and tempo to the start of your drive." },
      { song: "Yellow", artist: "Coldplay", phase: "warmup", why: "An iconic, comforting alternative rock track to set a positive headspace." },
      { song: "Sweater Weather", artist: "The Neighbourhood", phase: "discovery", why: "A moody indie pop track that fits a cool, relaxed driving pace." },
      { song: "Nightcall", artist: "Kavinsky", phase: "discovery", why: "A retro synthwave classic that turns your commute into a cinematic experience." },
      { song: "Circles", artist: "Post Malone", phase: "discovery", why: "An easygoing indie-pop track with a continuous driving bassline." },
      { song: "Ocean Eyes", artist: "Billie Eilish", phase: "discovery", why: "A sparse, beautiful ambient pop track for a calm focus session." },
      { song: "Let Me Down Slowly", artist: "Alec Benjamin", phase: "fallback", why: "A melodic acoustic-pop ballad that acts as a safe, comforting closing track." },
      { song: "Fix You", artist: "Coldplay", phase: "fallback", why: "A building anthem with a powerful resolution to complete your trip." }
    ];
  }

  return {
    session_title: title,
    explanation_overview: explanation,
    recommended_tracks: tracks
  };
}

// Endpoint to generate session plan and playlist
app.post('/api/generate-session', async (req, res) => {
  try {
    const {
      spotify_access_token,
      gemini_api_key,
      gemini_model,
      preferred_taste,
      mood,
      duration,
      adventure
    } = req.body;

    if (!spotify_access_token) {
      return res.status(400).json({ error: 'Missing Spotify Access Token' });
    }

    const isDemoMode = spotify_access_token === 'demo_token';

    // Resolve Gemini API key (client-provided or backend .env)
    const apiKey = gemini_api_key || process.env.GEMINI_API_KEY;
    if (!apiKey && !isDemoMode) {
      return res.status(400).json({ error: 'Missing Gemini API Key. Please provide one in the UI or backend environment.' });
    }

    console.log(`[Compass Server] Generating session: mood=${mood}, duration=${duration}m, adventure=${adventure}`);

    // 1. Fetch Spotify User Profile (Bypassed in Demo Mode)
    let userId = '';
    let userName = 'Guest Commuter';

    if (!isDemoMode) {
      try {
        const userProfileRes = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${spotify_access_token}` }
        });
        if (userProfileRes.ok) {
          const userProfile = await userProfileRes.json();
          userId = userProfile.id;
          userName = userProfile.display_name || userProfile.id;
        } else {
          throw new Error(`Failed to fetch profile: ${userProfileRes.statusText}`);
        }
      } catch (err) {
        console.error('[Spotify API Error]', err);
        return res.status(401).json({ error: 'Unauthorized. Spotify access token might be invalid or expired.' });
      }
    }

    // 2. Fetch User's Top Artists & Tracks to capture taste context (Mocked in Demo Mode)
    let topArtistsText = 'Unknown';
    let topTracksText = 'Unknown';

    if (isDemoMode) {
      topArtistsText = "Arijit Singh (Bollywood, Pop), Diljit Dosanjh (Punjabi, Pop), AR Rahman (Soundtrack, Classical), Coldplay (Pop, Rock), The Weeknd (R&B, Pop), Pritam (Bollywood, Soundtrack), Ed Sheeran (Pop, Singer-Songwriter)";
      topTracksText = "Kesariya by Arijit Singh & Pritam, Blinding Lights by The Weeknd, Kun Faya Kun by AR Rahman, Yellow by Coldplay, Lover by Diljit Dosanjh, Shape of You by Ed Sheeran, Pasoori by Ali Sethi & Shae Gill";
      console.log(`[Compass Server] Demo Mode: loaded mock user taste profile.`);
    } else {
      try {
        const topArtistsRes = await fetch('https://api.spotify.com/v1/me/top/artists?limit=15', {
          headers: { 'Authorization': `Bearer ${spotify_access_token}` }
        });
        const topTracksRes = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=15', {
          headers: { 'Authorization': `Bearer ${spotify_access_token}` }
        });

        if (topArtistsRes.ok) {
          const topArtistsData = await topArtistsRes.json();
          topArtistsText = topArtistsData.items.map(a => `${a.name} (${a.genres.slice(0,2).join(', ')})`).join(', ') || 'None';
        }
        if (topTracksRes.ok) {
          const topTracksData = await topTracksRes.json();
          topTracksText = topTracksData.items.map(t => `${t.name} by ${t.artists.map(a => a.name).join('&')}`).join(', ') || 'None';
        }
        console.log(`[Compass Server] Spotify top artists: "${topArtistsText}"`);
        console.log(`[Compass Server] Spotify top tracks: "${topTracksText}"`);
      } catch (err) {
        console.warn('[Spotify API Warning] Could not fetch top taste profile, using defaults.', err);
      }
    }

    // 3. Construct Gemini Prompt
    const systemPrompt = `You are Commute Compass, an AI music curation agent. Your job is to generate a personalized playlist plan of exactly 8 songs for a user's daily commute.
You must structure the playlist as follows:
- 1-2 Warm-up tracks (familiar or semi-familiar low-risk songs matching the current mood).
- 4-5 Discovery tracks (new, exploratory songs outside the user's immediate top artists but aligned with their favorite genres/vibes).
- 1-2 Fallback tracks (reliable favorites or safe recommendations to close the session).

CRITICAL REQUIREMENT - LANGUAGE & REGION MATCHING:
- You must carefully analyze the "User Taste Profile" and "User Taste Preferences (Direct Input)" below to detect the user's preferred music languages and regions (e.g. Hindi, Punjabi, Spanish, K-Pop, English, etc.).
- The recommended tracks must match the language and cultural distribution of the user's taste. If the user listens primarily to Hindi music, or a mix of Hindi and English, the output playlist MUST reflect this mix. Do not default to English/Western pop unless that is the dominant category in their taste profile.
- If the user has specified 'User Taste Preferences (Direct Input)', you MUST heavily prioritize these genres, artists, and languages in all Warm-up, Discovery, and Fallback track selections. For example, if they specify "Hindi" or "Bollywood", you MUST select Hindi/Bollywood tracks for all 8 positions that match their mood.
- For "Discovery" tracks, suggest new artists and tracks in the same language categories as their favorites (e.g., if they like Hindi romantic tracks, recommend other Hindi or regional Indian artists they may not have in their top-15 list).

Inputs:
- Commute Duration: ${duration} minutes
- Current Mood: ${mood}
- Adventure Level: ${adventure} (Scale of 1 to 5. 1 = play only extremely familiar top artists, 5 = play obscure, wild discovery tracks)
- User Taste Preferences (Direct Input): ${preferred_taste || 'None specified'}
- User Taste Profile: Top Artists: [${topArtistsText}], Top Tracks: [${topTracksText}]

Output:
You must output a single, raw JSON object matching the JSON Schema provided. Do not wrap the JSON in Markdown formatting codeblocks. Do not include any introductory or concluding text.`;

    // 4. Query Gemini API
    const modelName = gemini_model || 'models/gemini-1.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
    const geminiPayload = {
      contents: [{
        parts: [{ text: systemPrompt }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            session_title: { type: 'STRING', description: 'A creative title for this specific commute session.' },
            explanation_overview: { type: 'STRING', description: "A 2-sentence summary explaining how this playlist balances the user's mood and adventure level." },
            recommended_tracks: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  song: { type: 'STRING', description: 'The exact song title.' },
                  artist: { type: 'STRING', description: 'The artist name.' },
                  phase: { type: 'STRING', enum: ['warmup', 'discovery', 'fallback'], description: 'The structural role of this song in the session.' },
                  why: { type: 'STRING', description: 'A short, 2-sentence explanation of why this song fits the user\'s specific context and tastes.' }
                },
                required: ['song', 'artist', 'phase', 'why']
              }
            }
          },
          required: ['session_title', 'explanation_overview', 'recommended_tracks']
        }
      }
    };

    let parsedSession;
    let fallbackUsed = false;

    try {
      if (!apiKey && isDemoMode) {
        throw new Error('No Gemini API key supplied, triggering fallback session generation.');
      }
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.warn(`[Gemini API Warning] Gemini returned error ${geminiRes.status}: ${errText}`);
        if (isDemoMode) {
          fallbackUsed = true;
          parsedSession = getMockSession(mood, preferred_taste);
        } else {
          throw new Error(`Gemini API returned error ${geminiRes.status}: ${errText}`);
        }
      } else {
        const geminiData = await geminiRes.json();
        const rawResultText = geminiData.candidates[0].content.parts[0].text;
        
        // Clean potential markdown backticks
        let cleanedText = rawResultText.trim();
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        }
        
        parsedSession = JSON.parse(cleanedText);
        console.log(`[Compass Server] AI generated: "${parsedSession.session_title}"`);
      }
    } catch (geminiErr) {
      console.warn('[Gemini Request Error]', geminiErr.message);
      if (isDemoMode) {
        fallbackUsed = true;
        parsedSession = getMockSession(mood, preferred_taste);
      } else {
        throw geminiErr;
      }
    }

    // 5. Match tracks using Spotify Search API
    let searchToken = spotify_access_token;
    if (isDemoMode) {
      try {
        searchToken = await getClientCredentialsToken();
      } catch (tokenErr) {
        console.error('[Client Credentials Token Error]', tokenErr);
        return res.status(500).json({ error: 'Failed to acquire client credentials token for guest search.' });
      }
    }

    const tracksWithUris = [];
    for (const track of parsedSession.recommended_tracks) {
      let spotifyUri = null;
      let externalUrl = null;
      try {
        const query = encodeURIComponent(`track:${track.song} artist:${track.artist}`);
        const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`, {
          headers: { 'Authorization': `Bearer ${searchToken}` }
        });
        
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.tracks.items.length > 0) {
            spotifyUri = searchData.tracks.items[0].uri;
            externalUrl = searchData.tracks.items[0].external_urls.spotify;
          }
        }
      } catch (err) {
        console.warn(`[Spotify Search Warning] Failed search for: ${track.song} by ${track.artist}`, err);
      }
      
      tracksWithUris.push({
        ...track,
        spotifyUri,
        externalUrl
      });
    }

    // 6. Create Playlist on user account
    let playlistUrl = null;
    let playlistId = null;
    const validUris = tracksWithUris.filter(t => t.spotifyUri).map(t => t.spotifyUri);

    if (validUris.length > 0 && !isDemoMode) {
      try {
        // Create Playlist
        const createPlaylistRes = await fetch('https://api.spotify.com/v1/me/playlists', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${spotify_access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `Commute Compass: ${parsedSession.session_title}`,
            description: `AI-native commute session. ${parsedSession.explanation_overview} Generated by Commute Compass.`,
            public: false
          })
        });

        if (createPlaylistRes.ok) {
          const playlistData = await createPlaylistRes.json();
          playlistId = playlistData.id;
          playlistUrl = playlistData.external_urls.spotify;

          // Add tracks to the created playlist
          const addTracksRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${spotify_access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uris: validUris })
          });

          if (!addTracksRes.ok) {
            console.error('[Spotify API Error] Failed to populate playlist tracks:', await addTracksRes.text());
          }
        } else {
          console.error('[Spotify API Error] Failed to create playlist structure:', await createPlaylistRes.text());
        }
      } catch (err) {
        console.error('[Spotify Playlist Error] Critical failure during playlist instantiation', err);
      }
    }

    // 7. Return merged response
    res.json({
      sessionTitle: parsedSession.session_title,
      explanationOverview: parsedSession.explanation_overview,
      tracks: tracksWithUris,
      playlistUrl,
      playlistId,
      userName,
      fallbackUsed
    });

  } catch (err) {
    console.error('[Compass Server Error]', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Fallback to index.html for single page routing
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Launch server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`Commute Compass MVP running at http://localhost:${PORT}/`);
    console.log(`===================================================`);
  });
}

module.exports = app;

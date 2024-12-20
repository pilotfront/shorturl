const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const urlDatabase = {}; // In-memory storage for shortened URLs

// Enable CORS for specific domains
const corsOptions = {
  origin: 'https://www.pilotfront.com', // Allow requests only from your Webflow domain
  methods: 'GET,POST', // Allowed HTTP methods
  allowedHeaders: 'Content-Type', // Allowed headers
};

// Middleware
app.use(cors(corsOptions)); // Apply CORS settings
app.use(express.json()); // Parse JSON body

// Home Route
app.get('/', (req, res) => {
  res.send('<h1>URL Shortener</h1><p>Use POST /shorten to create a short URL.</p>');
});

// Shorten a URL
app.post('/shorten', (req, res) => {
  const { originalUrl, password } = req.body;

  // Validate input
  if (!originalUrl || !password) {
    return res.status(400).json({ error: 'You must provide a URL and a password!' });
  }

  // Generate short ID and save to database
  const shortId = nanoid(6);
  urlDatabase[shortId] = {
    originalUrl,
    password,
    clicks: 0,
  };

  res.json({ shortUrl: `https://${req.headers.host}/${shortId}` });
});

// Redirect to the original URL
app.get( (req, res) => {
  const { shortId } = req.params;
  const entry = urlDatabase[shortId];

  // Check if the entry exists
  if (!entry) {
    return res.status(404).send('<h1>404 Not Found</h1>');
  }

  // Increment click count
  entry.clicks++;

  // Redirect to the original URL
  const originalUrl = entry.originalUrl.startsWith('http') 
    ? entry.originalUrl 
    : `https://${entry.originalUrl}`;
  
  res.redirect(originalUrl);
});

// Fetch URLs by Password
app.post('/list', (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required!' });
  }

  const urls = Object.entries(urlDatabase)
    .filter(([key, value]) => value.password === password)
    .map(([shortId, data]) => ({
      shortId,
      originalUrl: data.originalUrl,
      clicks: data.clicks,
    }));

  res.json(urls);
});

// Start the server
module.exports = app;

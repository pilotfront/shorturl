const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const urlDatabase = {}; // In-memory storage for shortened URLs

// Enable CORS for specific domains
const corsOptions = {
  origin: 'https://www.pilotfront.com', // Allow requests only from your Webflow domain
  methods: 'GET,POST, DELETE', // Allowed HTTP methods
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
  const { originalUrl, password, username } = req.body;

  // Validate input
  if (!originalUrl || !password || !username) {
    return res.status(400).json({ error: 'URL, password, and username are required!' });
  }

  // Generate short ID and save to database
  const shortId = nanoid(6);
  urlDatabase[shortId] = {
    originalUrl,
    password,
    username, // Save username along with other data
    clicks: 0,
  };

  res.json({ shortUrl: `https://${req.headers.host}/${shortId}` });
});

// Fetch URLs by Password and Username
app.post('/list', (req, res) => {
  const { password, username } = req.body;

  if (!password || !username) {
    return res.status(400).json({ error: 'Password and username are required!' });
  }

  const urls = Object.entries(urlDatabase)
    .filter(([key, value]) => value.password === password && value.username === username)
    .map(([shortId, data]) => ({
      shortId,
      originalUrl: data.originalUrl,
      clicks: data.clicks,
    }));

  res.json(urls);
});

// Delete a URL by shortId
app.delete('/delete/:shortId', (req, res) => {
  const { shortId } = req.params;

  // Check if the URL exists
  if (!urlDatabase[shortId]) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  // Delete the URL from the database
  delete urlDatabase[shortId];

  res.json({ message: 'URL deleted successfully' });
});

// Start the server
module.exports = app;

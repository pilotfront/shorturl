const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const urlDatabase = {}; // In-memory storage for shortened URLs

// Admin password
const ADMIN_PASSWORD = "abc";

// Enable CORS for specific domains
const corsOptions = {
  origin: ['https://www.pilotfront.com', 'https://www.pilotfront.click'], // Allow both domains
  methods: 'GET,POST,DELETE',
  allowedHeaders: 'Content-Type',
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
  const { originalUrl, username, password } = req.body;

  // Validate input
  if (!originalUrl || !password || !username) {
    return res.status(400).json({ error: 'You must provide a URL, username, and password!' });
  }

  // Generate short ID and save to database
  const shortId = nanoid(6);
  urlDatabase[shortId] = {
    originalUrl,
    username,
    password,
    clicks: 0,
  };

  res.json({ shortUrl: `https://${req.headers.host}/${shortId}` });
});

// Redirect to the original URL
app.get('/:shortId', (req, res) => {
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

// Fetch URLs by Password and Username
app.post('/list', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required!' });
  }

  const urls = Object.entries(urlDatabase)
    .filter(([key, value]) => value.username === username && value.password === password)
    .map(([shortId, data]) => ({
      shortId,
      originalUrl: data.originalUrl,
      clicks: data.clicks,
    }));

  res.json(urls);
});

// Admin Route to Fetch All URLs
app.get('/admin/list', (req, res) => {
  try {
    const { password } = req.query;

    if (!password) {
      return res.status(400).json({ error: 'Password is required!' });
    }

    if (password !== ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Invalid admin password!' });
    }

    const allUrls = Object.entries(urlDatabase).map(([shortId, data]) => ({
      shortId,
      originalUrl: data.originalUrl,
      username: data.username,
      password: data.password,
      clicks: data.clicks,
    }));

    res.json(allUrls);
  } catch (err) {
    console.error('Error fetching admin list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Admin Route to Delete URLs
app.delete('/admin/delete/:shortId', (req, res) => {
  const { password } = req.query;
  const { shortId } = req.params;

  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Invalid admin password!' });
  }

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

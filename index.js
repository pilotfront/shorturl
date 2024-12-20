const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// In-memory storage for shortened URLs and metadata
const urlDatabase = {};

// Enable CORS to allow requests from Webflow
app.use(cors());
app.use(express.json()); // Parse JSON request bodies

// Root Route
app.get('/', (req, res) => {
  res.send('<h1>Welcome to the URL Shortener!</h1><p>Use POST /shorten to shorten a URL.</p>');
});

// Shorten a URL
app.post('/shorten', (req, res) => {
  const { originalUrl, password } = req.body;

  // Validate input
  if (!originalUrl || !password) {
    return res.status(400).json({ error: 'You must provide a URL and a password!' });
  }

  // Generate a short ID and save the data
  const shortId = nanoid(6);
  urlDatabase[shortId] = {
    originalUrl,
    password,
    clicks: 0,
  };

  // Respond with the shortened URL
  res.json({ shortUrl: `https://${req.headers.host}/${shortId}` });
});

// Redirect to the original URL
app.get('/:shortId', (req, res) => {
  const { shortId } = req.params;
  const entry = urlDatabase[shortId];

  if (!entry) {
    return res.status(404).json({ error: 'URL not found!' });
  }

  // Increment the click count and redirect
  entry.clicks++;
  res.redirect(entry.originalUrl);
});

// Start the server (only for local testing; not needed for serverless deployment)
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

module.exports = app;

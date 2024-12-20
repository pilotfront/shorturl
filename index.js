const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors'); // Import the cors package

const app = express();
const port = process.env.PORT || 3000;

const urlDatabase = {};  // In-memory storage for short URLs

// Use CORS middleware
app.use(cors({
  origin: 'https://www.pilotfront.com', // Replace with your Webflow domain
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());  // Allow the server to handle JSON data

// Root Route
app.get('/', (req, res) => {
  res.send('<h1>Welcome to the URL Shortener!</h1><p>Use POST /shorten to shorten a URL.</p>');
});

// Shorten a URL with password
app.post('/shorten', (req, res) => {
  const { originalUrl, password } = req.body;

  // Check if the originalUrl and password are provided
  if (!originalUrl || !password) {
    return res.status(400).json({ error: 'You must provide a URL and a password!' });
  }

  const shortId = nanoid(6); // Create a unique ID for the URL

  // Store URL with password and click count (initially 0)
  urlDatabase[shortId] = {
    originalUrl,
    password,
    clickCount: 0,
  };

  // Send back the shortened URL
  res.json({ shortUrl: `https://${req.headers.host}/${shortId}` });
});

// Redirect to the original URL and track clicks
app.get('/:shortId', (req, res) => {
  const { shortId } = req.params;
  const urlData = urlDatabase[shortId];

  if (!urlData) {
    return res.status(404).json({ error: 'URL not found!' });
  }

  // Increment click count
  urlData.clickCount++;

  // Redirect to the original URL
  res.redirect(urlData.originalUrl);
});

// List URLs for a specific user (password protected)
app.post('/list', (req, res) => {
  const { password } = req.body;

  // Filter URLs by password
  const userUrls = Object.entries(urlDatabase)
    .filter(([id, data]) => data.password === password)
    .map(([id, data]) => ({
      shortUrl: `https://${req.headers.host}/${id}`,
      originalUrl: data.originalUrl,
      clickCount: data.clickCount,
    }));

  if (userUrls.length === 0) {
    return res.status(404).json({ error: 'No URLs found for this password.' });
  }

  res.json(userUrls);
});

// Delete a URL
app.post('/delete', (req, res) => {
  const { password, shortId } = req.body;

  const urlData = urlDatabase[shortId];

  if (!urlData) {
    return res.status(404).json({ error: 'URL not found!' });
  }

  if (urlData.password !== password) {
    return res.status(403).json({ error: 'Incorrect password.' });
  }

  delete urlDatabase[shortId];

  res.json({ message: 'URL deleted successfully.' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

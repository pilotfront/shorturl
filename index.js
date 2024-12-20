const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());  // This allows cross-origin requests
app.use(express.json());  // Allow the server to handle JSON data

const urlDatabase = {};  // In-memory storage for short URLs

// Root Route
app.get('/', (req, res) => {
  res.send('<h1>Welcome to the URL Shortener!</h1><p>Use POST /shorten to shorten a URL.</p>');
});

// Shorten a URL
app.post('/shorten', (req, res) => {
  const { originalUrl, password } = req.body;

  // Check if the originalUrl and password are provided
  if (!originalUrl || !password) {
    return res.status(400).json({ error: 'You must provide a URL and a password!' });
  }

  const shortId = nanoid(6); // Create a unique ID for the URL
  urlDatabase[shortId] = { originalUrl, password };  // Save the original URL and password

  // Send back the shortened URL
  res.json({ shortUrl: `https://${req.headers.host}/${shortId}` });
});

// Redirect to the original URL
app.get('/:shortId', (req, res) => {
  const { shortId } = req.params;
  const urlData = urlDatabase[shortId];

  if (!urlData) {
    return res.status(404).json({ error: 'URL not found!' });
  }

  // Redirect to the original URL
  res.redirect(urlData.originalUrl);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

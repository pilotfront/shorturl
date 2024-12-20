const express = require('express');
const { nanoid } = require('nanoid');

const app = express();
const port = process.env.PORT || 3000;

const urlDatabase = {};  // In-memory storage for short URLs

app.use(express.json());  // Allow the server to handle JSON data

// Root Route
app.get('/', (req, res) => {
  res.send('<h1>Welcome to the URL Shortener!</h1><p>Use POST /shorten to shorten a URL.</p>');
});

// Shorten a URL
app.post('/shorten', (req, res) => {
  const { originalUrl, password } = req.body;

  // Log the incoming request to check for missing data
  console.log("Received data:", req.body);

  // Check if both URL and password are provided
  if (!originalUrl || !password) {
    return res.status(400).json({ error: 'You must provide a URL and a password!' });
  }

  const shortId = nanoid(6);  // Create a unique ID for the URL
  urlDatabase[shortId] = { originalUrl, password, clicks: 0 };  // Save the URL and password

  // Send back the shortened URL
  res.json({ shortUrl: `https://${req.headers.host}/${shortId}` });
});

// Redirect to the original URL
app.get('/:shortId', (req, res) => {
  const { shortId } = req.params;
  const originalUrl = urlDatabase[shortId];

  if (!originalUrl) {
    return res.status(404).json({ error: 'URL not found!' });
  }

  // Redirect to the original URL
  res.redirect(originalUrl);
});


// List shortened URLs for a given password
app.post('/list', (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'You must provide a password!' });
  }

  // Retrieve the URLs associated with the given password
  const userUrls = Object.entries(urlDatabase).filter(([shortId, urlData]) => urlData.password === password);

  if (userUrls.length === 0) {
    return res.status(404).json({ error: 'No URLs found for this password!' });
  }

  // Send back the list of shortened URLs
  res.json({ urls: userUrls.map(([shortId, urlData]) => ({
    shortUrl: `https://${req.headers.host}/${shortId}`,
    originalUrl: urlData.originalUrl,
    clicks: urlData.clicks || 0
  })) });
});


// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

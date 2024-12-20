const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// In-memory storage for short URLs, each URL is associated with a user password
let urlDatabase = {};  // Format: { password: [{shortId, originalUrl, shortUrl, clicks}] }

app.use(cors({
  origin: 'https://www.pilotfront.com',  // Replace with your Webflow domain
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Root Route
app.get('/', (req, res) => {
  res.send('<h1>Welcome to the URL Shortener!</h1><p>Use POST /shorten to shorten a URL.</p>');
});

// Shorten a URL with password
app.post('/shorten', (req, res) => {
  const { originalUrl, password } = req.body;

  if (!originalUrl || !password) {
    return res.status(400).json({ error: 'You must provide a URL and password!' });
  }

  const shortId = nanoid(6);  // Create a unique ID for the URL
  const shortUrl = `https://${req.headers.host}/${shortId}`;

  // Initialize the user’s URL database if not already
  if (!urlDatabase[password]) {
    urlDatabase[password] = [];
  }

  // Add the shortened URL to the user's list
  urlDatabase[password].push({
    originalUrl,
    shortId,
    shortUrl,
    clicks: 0
  });

  res.json({ shortUrl });
});

// Redirect to the original URL
app.get('/:shortId', (req, res) => {
  const { shortId } = req.params;
  let originalUrl;

  // Search through each user's list of URLs
  for (const [password, urls] of Object.entries(urlDatabase)) {
    const url = urls.find(item => item.shortId === shortId);
    if (url) {
      originalUrl = url.originalUrl;
      url.clicks += 1;  // Increment click count
      break;
    }
  }

  if (!originalUrl) {
    return res.status(404).json({ error: 'URL not found!' });
  }

  res.redirect(originalUrl);
});

// View shortened URLs and clicks by password
app.post('/view', (req, res) => {
  const { password } = req.body;

  if (!password || !urlDatabase[password]) {
    return res.status(404).json({ error: 'Incorrect password or no URLs found.' });
  }

  res.json({ urls: urlDatabase[password] });
});

// Delete a shortened URL by password and shortId
app.delete('/delete', (req, res) => {
  const { password, shortId } = req.body;

  if (!password || !shortId || !urlDatabase[password]) {
    return res.status(400).json({ error: 'Password or short URL ID is missing!' });
  }

  const userUrls = urlDatabase[password];
  const index = userUrls.findIndex(item => item.shortId === shortId);

  if (index === -1) {
    return res.status(404).json({ error: 'URL not found!' });
  }

  // Delete the URL from the user's list
  userUrls.splice(index, 1);

  res.json({ message: 'URL deleted successfully' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

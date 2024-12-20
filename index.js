const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

let urlDatabase = {};  // In-memory storage for short URLs

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

// Shorten a URL
app.post('/shorten', (req, res) => {
  const { originalUrl, userId } = req.body;

  if (!originalUrl || !userId) {
    return res.status(400).json({ error: 'You must provide a URL and user ID!' });
  }

  const shortId = nanoid(6); // Create a unique ID for the URL
  const shortUrl = `https://${req.headers.host}/${shortId}`;
  
  // Create user-specific data
  if (!urlDatabase[userId]) {
    urlDatabase[userId] = [];
  }

  // Store the shortened URL with click count
  urlDatabase[userId].push({ originalUrl, shortId, shortUrl, clicks: 0 });
  
  // Send back the shortened URL
  res.json({ shortUrl });
});

// Redirect to the original URL
app.get('/:shortId', (req, res) => {
  const { shortId } = req.params;
  
  // Find the original URL for the shortId
  let originalUrl;
  Object.values(urlDatabase).forEach(userUrls => {
    const url = userUrls.find(item => item.shortId === shortId);
    if (url) {
      originalUrl = url.originalUrl;
      url.clicks += 1;  // Increment click count
    }
  });

  if (!originalUrl) {
    return res.status(404).json({ error: 'URL not found!' });
  }

  // Redirect to the original URL
  res.redirect(originalUrl);
});

// Delete a shortened URL
app.delete('/delete', (req, res) => {
  const { userId, shortId } = req.body;

  if (!userId || !shortId) {
    return res.status(400).json({ error: 'You must provide a user ID and short URL ID!' });
  }

  // Find and delete the URL
  const userUrls = urlDatabase[userId];
  if (!userUrls) {
    return res.status(404).json({ error: 'User not found!' });
  }

  urlDatabase[userId] = userUrls.filter(item => item.shortId !== shortId);

  res.json({ message: 'URL deleted successfully' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

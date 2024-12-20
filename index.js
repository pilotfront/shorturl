const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const password = "yourPassword";  // Change this to a secure password
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
  const { originalUrl, userPassword } = req.body;

  if (!originalUrl || !userPassword) {
    return res.status(400).json({ error: 'You must provide a URL and password!' });
  }

  if (userPassword !== password) {
    return res.status(403).json({ error: 'Incorrect password!' });
  }

  const shortId = nanoid(6); // Create a unique ID for the URL
  const shortUrl = `https://${req.headers.host}/${shortId}`;

  // Store the shortened URL for this password
  if (!urlDatabase[userPassword]) {
    urlDatabase[userPassword] = [];
  }

  urlDatabase[userPassword].push({ originalUrl, shortId, shortUrl, clicks: 0 });
  
  // Send back the shortened URL
  res.json({ shortUrl });
});

// Redirect to the original URL
app.get('/:shortId', (req, res) => {
  const { shortId } = req.params;

  let originalUrl;
  Object.entries(urlDatabase).forEach(([userPassword, userUrls]) => {
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
  const { userPassword, shortId } = req.body;

  if (!userPassword || !shortId) {
    return res.status(400).json({ error: 'You must provide a password and short URL ID!' });
  }

  if (userPassword !== password) {
    return res.status(403).json({ error: 'Incorrect password!' });
  }

  const userUrls = urlDatabase[userPassword];
  if (!userUrls) {
    return res.status(404).json({ error: 'User not found!' });
  }

  urlDatabase[userPassword] = userUrls.filter(item => item.shortId !== shortId);

  res.json({ message: 'URL deleted successfully' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

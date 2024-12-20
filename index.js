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
  const { originalUrl } = req.body;
  
  // Validate that the originalUrl is provided
  if (!originalUrl) {
    return res.status(400).json({ error: 'You must provide a URL!' });
  }

  const shortId = nanoid(6); // Create a unique ID for the URL
  urlDatabase[shortId] = originalUrl;  // Save the original URL in the database

  // Send back the shortened URL
  res.json({ shortUrl: `https://${req.headers.host}/${shortId}` });
});

// Redirect to the original URL
app.get('/:shortId', (req, res) => {
  const { shortId } = req.params;
  const originalUrl = urlDatabase[shortId];

  if (!originalUrl) {
    return res.status(404).send('URL not found!');
  }

  res.redirect(originalUrl); // Redirect to the original URL
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

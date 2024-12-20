const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');  // Import the cors package

const app = express();
const port = process.env.PORT || 3000;

const urlDatabase = {};  // In-memory storage for short URLs

// Use CORS middleware
app.use(cors({
  origin: 'https://www.pilotfront.com',  // Replace with your domain
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());  // Allow the server to handle JSON data

// Root Route
app.get('/', (req, res) => {
  res.send('<h1>Welcome to the URL Shortener!</h1><p>Use POST /shorten to shorten a URL.</p>');
});

// Shorten a URL
app.post('/shorten', (req, res) => {
  const { originalUrl } = req.body;

  // Check if the originalUrl is provided
  if (!originalUrl) {
    return res.status(400).json({ error: 'You must provide a URL!' });
  }

  const shortId = nanoid(6); // Create a unique ID for the URL
  urlDatabase[shortId] = originalUrl;  // Save in-memory database

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

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

const express = require('express');
const bodyParser = require('body-parser');
const { nanoid } = require('nanoid');

const app = express();
const port = process.env.PORT || 3000;

const urlDatabase = {};  // In-memory storage for short URLs

// Middleware to parse form data and JSON
app.use(bodyParser.urlencoded({ extended: true })); // To handle Webflow form submissions
app.use(bodyParser.json());

// Root Route
app.get('/', (req, res) => {
  res.send('<h1>Welcome to the URL Shortener!</h1><p>Use POST /shorten to shorten a URL or submit a form via Webflow.</p>');
});

// Endpoint to handle Webflow form submissions
app.post('/form', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    console.log('Form submission failed: Missing fields.');
    return res.status(400).json({ error: 'All fields are required!' });
  }

  console.log('Form submitted successfully:', {
    name,
    email,
    message,
  });

  // You can process the form data further, like sending an email or saving to a database

  // Respond to Webflow form with a success message
  res.status(200).json({ success: true, message: 'Form submitted successfully!' });
});

// Shorten a URL
app.post('/shorten', (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ error: 'You must provide a URL!' });
  }

  const shortId = nanoid(6);
  urlDatabase[shortId] = originalUrl;

  console.log(`Shortened URL: /${shortId} -> ${originalUrl}`);

  res.json({ shortUrl: `https://${req.headers.host}/${shortId}` });
});

// Redirect to the original URL
app.get('/:shortId', (req, res) => {
  const { shortId } = req.params;
  const originalUrl = urlDatabase[shortId];

  console.log(`Attempting to redirect: /${shortId}`);

  if (!originalUrl) {
    return res.status(404).json({ error: 'URL not found!' });
  }

  res.redirect(originalUrl);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

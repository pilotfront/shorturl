const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const urlDatabase = {}; // In-memory storage for shortened URLs

// Enable CORS for specific domains
const corsOptions = {
  origin: 'https://www.pilotfront.com', // Allow requests only from your Webflow domain
  methods: 'GET,POST, DELETE', // Allowed HTTP methods
  allowedHeaders: 'Content-Type', // Allowed headers
};

// Middleware
app.use(cors(corsOptions)); // Apply CORS settings
app.use(express.json()); // Parse JSON body

// Home Route
app.get('/', (req, res) => {
  res.send('<h1>URL Shortener</h1><p>Use POST /shorten to create a short URL.</p>');
});

// Admin Route - Password Protected
app.get('/admin', (req, res) => {
  const password = req.query.password;

  if (password !== 'abc') {
    return res.status(403).send('<h1>Forbidden</h1><p>Invalid password.</p>');
  }

  let html = '<h1>Admin Page</h1>';
  html += '<h2>All URLs</h2>';
  html += '<table border="1"><thead><tr><th>Short URL</th><th>Original URL</th><th>Username</th><th>Password</th><th>Click Count</th><th>Delete</th></tr></thead><tbody>';

  for (let shortId in urlDatabase) {
    const entry = urlDatabase[shortId];
    html += `<tr>
      <td><a href="https://${req.headers.host}/${shortId}" target="_blank">${shortId}</a></td>
      <td><a href="${entry.originalUrl}" target="_blank">${entry.originalUrl}</a></td>
      <td>${entry.username}</td>
      <td>${entry.password}</td>
      <td>${entry.clicks}</td>
      <td><button onclick="deleteUrl('${shortId}')">Delete</button></td>
    </tr>`;
  }

  html += '</tbody></table>';
  html += `<script>
    function deleteUrl(shortId) {
      fetch('/delete/' + shortId, { method: 'DELETE' })
        .then(response => response.json())
        .then(data => {
          if (data.message) {
            alert(data.message);
            window.location.reload();
          }
        })
        .catch(error => alert('Error deleting URL: ' + error));
    }
  </script>`;

  res.send(html);
});

// Shorten a URL
app.post('/shorten', (req, res) => {
  const { originalUrl, password, username } = req.body;

  // Validate input
  if (!originalUrl || !password || !username) {
    return res.status(400).json({ error: 'You must provide a URL, password, and username!' });
  }

  // Generate short ID and save to database
  const shortId = nanoid(6);
  urlDatabase[shortId] = {
    originalUrl,
    password,
    username,
    clicks: 0,
  };

  res.json({ shortUrl: `https://${req.headers.host}/${shortId}` });
});

// Redirect to the original URL
app.get('/:shortId', (req, res) => {
  const { shortId } = req.params;
  const entry = urlDatabase[shortId];

  // Check if the entry exists
  if (!entry) {
    return res.status(404).send('<h1>404 Not Found</h1>');
  }

  // Increment click count
  entry.clicks++;

  // Redirect to the original URL
  const originalUrl = entry.originalUrl.startsWith('http') 
    ? entry.originalUrl 
    : `https://${entry.originalUrl}`;
  
  res.redirect(originalUrl);
});

// Fetch URLs by Password and Username
app.post('/list', (req, res) => {
  const { password, username } = req.body;

  if (!password || !username) {
    return res.status(400).json({ error: 'Password and username are required!' });
  }

  const urls = Object.entries(urlDatabase)
    .filter(([key, value]) => value.password === password && value.username === username)
    .map(([shortId, data]) => ({
      shortId,
      originalUrl: data.originalUrl,
      clicks: data.clicks,
    }));

  res.json(urls);
});

// Delete a URL by shortId
app.delete('/delete/:shortId', (req, res) => {
  const { shortId } = req.params;

  // Check if the URL exists
  if (!urlDatabase[shortId]) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  // Delete the URL from the database
  delete urlDatabase[shortId];

  res.json({ message: 'URL deleted successfully' });
});

// Start the server
module.exports = app;

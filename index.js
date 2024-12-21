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

// Admin Route - Password Protected with a pop-up prompt
app.get('/admin', (req, res) => {
  let html = `
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Page</title>
      </head>
      <body>
        <h1>Admin Dashboard</h1>
        <script>
          const password = prompt("Please enter the admin password:");
          if (password !== "abc") {
            alert("Invalid password!");
            window.location.href = "/";
          } else {
            // Proceed to load the admin content if the password is correct
            document.body.innerHTML = \`<h2>All URLs</h2><table border="1"><thead><tr><th>Short URL</th><th>Original URL</th><th>Username</th><th>Password</th><th>Click Count</th><th>Delete</th></tr></thead><tbody>\`;
            
            fetch('/get-urls')
              .then(response => response.json())
              .then(data => {
                data.forEach(entry => {
                  document.body.innerHTML += \`
                    <tr>
                      <td><a href="\${entry.shortUrl}" target="_blank">\${entry.shortId}</a></td>
                      <td>\${entry.originalUrl}</td>
                      <td>\${entry.username}</td>
                      <td>\${entry.password}</td>
                      <td>\${entry.clicks}</td>
                      <td><button onclick="deleteUrl('\${entry.shortId}')">Delete</button></td>
                    </tr>
                  \`;
                });
                document.body.innerHTML += \`</tbody></table>\`;
              });
          }
          
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
        </script>
      </body>
    </html>
  `;
  res.send(html);
});

// Route to fetch all URLs (only accessible after entering the correct password)
app.get('/get-urls', (req, res) => {
  const urls = Object.entries(urlDatabase).map(([shortId, data]) => ({
    shortId,
    shortUrl: `https://${req.headers.host}/${shortId}`,
    originalUrl: data.originalUrl,
    username: data.username,
    password: data.password,
    clicks: data.clicks,
  }));

  res.json(urls);
});

// New route to handle custom short URL creation
app.post('/create-custom-short-url', (req, res) => {
  const { shortId, originalUrl, username, password } = req.body;

  // Validate input
  if (!shortId || !originalUrl || !username || !password) {
    return res.status(400).json({ error: 'All fields are required!' });
  }

  // Check if the custom short ID already exists
  if (urlDatabase[shortId]) {
    return res.status(400).json({ error: 'Custom short ID already exists!' });
  }

  // Add the new URL with the custom short ID to the database
  urlDatabase[shortId] = {
    originalUrl,
    username,
    password,
    clicks: 0,
  };

  // Respond with the newly created short URL
  res.json({ shortUrl: `https://${req.headers.host}/${shortId}` });
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

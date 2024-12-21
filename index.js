const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');
const session = require('express-session');

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
app.use(express.urlencoded({ extended: true })); // For parsing form data
app.use(session({
  secret: 'your-secret-key', // Use a secret key for session signing
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // set to true if you're using HTTPS
}));

// Home Route
app.get('/', (req, res) => {
  res.send('<h1>URL Shortener</h1><p>Use POST /shorten to create a short URL.</p>');
});

// Login Route (POST) - Handle the authentication
app.post('/admin/login', (req, res) => {
  const { password } = req.body;

  // Check the password on the server side
  if (password === 'abc') {
    // Store the authenticated session
    req.session.isAuthenticated = true;
    res.redirect('/admin/dashboard');
  } else {
    res.status(401).send('<h1>Invalid password</h1><p>Access denied.</p>');
  }
});

// Admin Route - Password Protected (GET)
app.get('/admin', (req, res) => {
  // If the user is already authenticated, redirect to the dashboard
  if (req.session.isAuthenticated) {
    return res.redirect('/admin/dashboard');
  }

  // If not authenticated, show the login form
  res.send(`
    <h1>Admin Login</h1>
    <form method="POST" action="/admin/login">
      <label for="password">Password:</label>
      <input type="password" id="password" name="password" required>
      <button type="submit">Login</button>
    </form>
  `);
});

// Admin Dashboard Route - Protected Content
app.get('/admin/dashboard', (req, res) => {
  // Ensure the user is authenticated before rendering the admin dashboard
  if (!req.session.isAuthenticated) {
    return res.status(403).send('<h1>Forbidden</h1><p>Access Denied.</p>');
  }

  let html = '<h1>Admin Dashboard</h1>';
  html += '<h2>All URLs</h2>';
  html += '<table border="1"><thead><tr><th>Short URL</th><th>Original URL</th><th>Username</th><th>Password</th><th>Click Count</th><th>Delete</th></tr></thead><tbody>';

  // Populate the URLs in the database
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

  // Form for creating a custom short URL
  html += `
    <h2>Create Custom Short URL</h2>
    <form id="custom-short-form">
      <label for="custom-short-id">Custom Short ID:</label>
      <input type="text" id="custom-short-id" required>
      <label for="custom-original-url">Original URL:</label>
      <input type="url" id="custom-original-url" required>
      <label for="custom-username">Username:</label>
      <input type="text" id="custom-username" required>
      <label for="custom-password">Password:</label>
      <input type="password" id="custom-password" required>
      <button type="submit">Create Custom Short URL</button>
    </form>
    <div id="custom-result"></div>
    <script>
      // Handle custom short URL creation
      document.getElementById('custom-short-form').addEventListener('submit', function(event) {
        event.preventDefault();

        const customShortId = document.getElementById('custom-short-id').value.trim();
        const customOriginalUrl = document.getElementById('custom-original-url').value.trim();
        const customUsername = document.getElementById('custom-username').value.trim();
        const customPassword = document.getElementById('custom-password').value.trim();

        // Validate input
        if (!customShortId || !customOriginalUrl || !customUsername || !customPassword) {
          alert('Please fill all the fields!');
          return;
        }

        fetch('/create-custom-short-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shortId: customShortId,
            originalUrl: customOriginalUrl,
            username: customUsername,
            password: customPassword,
          }),
        })
        .then(response => response.json())
        .then(data => {
          if (data.shortUrl) {
            document.getElementById('custom-result').innerHTML = 'Custom Short URL Created: <a href="' + data.shortUrl + '" target="_blank">' + data.shortUrl + '</a>';
          } else if (data.error) {
            document.getElementById('custom-result').innerHTML = 'Error: ' + data.error;
          }
        })
        .catch(error => {
          console.error('Error:', error);
        });
      });

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
  `;

  res.send(html);
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

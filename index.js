const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');
const crypto = require('crypto'); // Built-in Node.js crypto module

const app = express();
const urlDatabase = {}; // In-memory storage for shortened URLs

// Store admin credentials securely (in production, use environment variables)
const ADMIN_PASSWORD = 'your_secure_password_here'; // Change this to your desired password
const TOKEN_SECRET = crypto.randomBytes(64).toString('hex'); // Generate a random token secret

// Generate a secure token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Store valid tokens (in production, use Redis or similar)
const validTokens = new Set();

// Middleware to verify admin token
const verifyAdminToken = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Enable CORS for specific domains
const corsOptions = {
  origin: 'https://www.pilotfront.com',
  methods: 'GET,POST,DELETE',
  allowedHeaders: ['Content-Type', 'x-admin-token'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Admin login route
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  const token = generateToken();
  validTokens.add(token);
  
  // Token expires after 24 hours
  setTimeout(() => {
    validTokens.delete(token);
  }, 24 * 60 * 60 * 1000);
  
  res.json({ token });
});

// Admin logout route
app.post('/admin/logout', verifyAdminToken, (req, res) => {
  const token = req.headers['x-admin-token'];
  validTokens.delete(token);
  res.json({ message: 'Logged out successfully' });
});

// Secure admin page route
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Login</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .login-form { max-width: 300px; margin: 0 auto; }
        input, button { width: 100%; padding: 8px; margin: 10px 0; }
        button { background: #007bff; color: white; border: none; cursor: pointer; }
        .error { color: red; display: none; }
      </style>
    </head>
    <body>
      <div class="login-form">
        <h2>Admin Login</h2>
        <div id="error" class="error"></div>
        <input type="password" id="password" placeholder="Enter admin password">
        <button onclick="login()">Login</button>
      </div>
      <script>
        async function login() {
          const password = document.getElementById('password').value;
          const errorDiv = document.getElementById('error');
          
          try {
            const response = await fetch('/admin/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
              // Store token and redirect to dashboard
              localStorage.setItem('adminToken', data.token);
              window.location.href = '/admin/dashboard';
            } else {
              errorDiv.style.display = 'block';
              errorDiv.textContent = data.error;
            }
          } catch (error) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = 'An error occurred. Please try again.';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Secure admin dashboard route
app.get('/admin/dashboard', verifyAdminToken, (req, res) => {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        button { cursor: pointer; }
        .logout { float: right; }
      </style>
    </head>
    <body>
      <button onclick="logout()" class="logout">Logout</button>
      <h1>Admin Dashboard</h1>
      <h2>All URLs</h2>
      <table>
        <thead>
          <tr>
            <th>Short URL</th>
            <th>Original URL</th>
            <th>Username</th>
            <th>Password</th>
            <th>Click Count</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (let shortId in urlDatabase) {
    const entry = urlDatabase[shortId];
    html += `
      <tr>
        <td><a href="https://${req.headers.host}/${shortId}" target="_blank">${shortId}</a></td>
        <td><a href="${entry.originalUrl}" target="_blank">${entry.originalUrl}</a></td>
        <td>${entry.username}</td>
        <td>${entry.password}</td>
        <td>${entry.clicks}</td>
        <td><button onclick="deleteUrl('${shortId}')">Delete</button></td>
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>
      <script>
        // Check for admin token on page load
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
          window.location.href = '/admin';
        }

        function deleteUrl(shortId) {
          fetch('/delete/' + shortId, {
            method: 'DELETE',
            headers: {
              'x-admin-token': adminToken
            }
          })
          .then(response => response.json())
          .then(data => {
            if (data.message) {
              alert(data.message);
              window.location.reload();
            }
          })
          .catch(error => alert('Error deleting URL: ' + error));
        }

        async function logout() {
          try {
            await fetch('/admin/logout', {
              method: 'POST',
              headers: {
                'x-admin-token': adminToken
              }
            });
            localStorage.removeItem('adminToken');
            window.location.href = '/admin';
          } catch (error) {
            console.error('Logout error:', error);
          }
        }

        // Add token to all fetch requests
        const originalFetch = window.fetch;
        window.fetch = function() {
          if (arguments[1] && arguments[1].headers) {
            arguments[1].headers['x-admin-token'] = adminToken;
          }
          return originalFetch.apply(this, arguments);
        };
      </script>
    </body>
    </html>
  `;

  res.send(html);
});

// Keep your existing routes...




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

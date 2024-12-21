const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const urlDatabase = {}; // In-memory storage for shortened URLs

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Store admin credentials securely
const ADMIN_PASSWORD = '123'; // Change this!
const validTokens = new Set();

// CORS configuration
const corsOptions = {
  origin: ['https://www.pilotfront.com', 'https://www.pilotfront.click'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-token'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Middleware to verify admin token
const verifyAdminToken = (req, res, next) => {
  try {
    const token = req.headers['x-admin-token'];
    console.log('Token verification attempt:', token ? 'Token present' : 'No token');
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    
    if (!validTokens.has(token)) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    next(error);
  }
};

// Login route
app.post('/admin/login', (req, res) => {
  try {
    const { password } = req.body;
    console.log('Login attempt received');

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    validTokens.add(token);
    console.log('Login successful, token generated');

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Verify token route
app.post('/admin/verify', verifyAdminToken, (req, res) => {
  try {
    res.json({ valid: true });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed', details: error.message });
  }
});

// Get URLs route
app.get('/admin/urls', verifyAdminToken, (req, res) => {
  try {
    res.json(urlDatabase);
  } catch (error) {
    console.error('Get URLs error:', error);
    res.status(500).json({ error: 'Failed to fetch URLs', details: error.message });
  }
});

// Logout route
app.post('/admin/logout', verifyAdminToken, (req, res) => {
  try {
    const token = req.headers['x-admin-token'];
    validTokens.delete(token);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed', details: error.message });
  }
});

// Admin login page
app.get('/admin', (req, res) => {
  try {
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
          .error { color: red; display: none; margin: 10px 0; }
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
            errorDiv.style.display = 'none';
            
            try {
              const response = await fetch('/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
                credentials: 'include'
              });
              
              const data = await response.json();
              
              if (response.ok) {
                localStorage.setItem('adminToken', data.token);
                window.location.href = '/admin/dashboard';
              } else {
                errorDiv.style.display = 'block';
                errorDiv.textContent = data.error || 'Login failed';
              }
            } catch (error) {
              console.error('Login error:', error);
              errorDiv.style.display = 'block';
              errorDiv.textContent = 'An error occurred. Please try again.';
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Admin page error:', error);
    res.status(500).send('Error loading admin page');
  }
});

// Admin dashboard page
app.get('/admin/dashboard', (req, res) => {
  try {
    res.send(`
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
          #error-message { color: red; display: none; }
          .loading { text-align: center; padding: 20px; }
        </style>
      </head>
      <body>
        <div id="loading" class="loading">Loading...</div>
        <div id="content" style="display: none;">
          <button onclick="logout()" class="logout">Logout</button>
          <div id="error-message"></div>
          <h1>Admin Dashboard</h1>
          <table>
            <thead>
              <tr>
                <th>Short URL</th>
                <th>Original URL</th>
                <th>Username</th>
                <th>Password</th>
                <th>Click Count</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="urls-table">
            </tbody>
          </table>
        </div>

        <script>
          const token = localStorage.getItem('adminToken');
          if (!token) {
            window.location.href = '/admin';
          }

          async function loadUrls() {
            try {
              const response = await fetch('/admin/urls', {
                headers: {
                  'x-admin-token': token
                }
              });

              if (!response.ok) {
                throw new Error('Failed to load URLs');
              }

              const urls = await response.json();
              const tbody = document.getElementById('urls-table');
              tbody.innerHTML = '';

              for (const [shortId, data] of Object.entries(urls)) {
                const row = document.createElement('tr');
                row.innerHTML = \`
                  <td><a href="/${shortId}" target="_blank">${shortId}</a></td>
                  <td><a href="\${data.originalUrl}" target="_blank">\${data.originalUrl}</a></td>
                  <td>\${data.username}</td>
                  <td>\${data.password}</td>
                  <td>\${data.clicks}</td>
                  <td><button onclick="deleteUrl('\${shortId}')">Delete</button></td>
                \`;
                tbody.appendChild(row);
              }

              document.getElementById('loading').style.display = 'none';
              document.getElementById('content').style.display = 'block';
            } catch (error) {
              console.error('Load URLs error:', error);
              showError('Failed to load URLs: ' + error.message);
            }
          }

          async function deleteUrl(shortId) {
            try {
              const response = await fetch('/delete/' + shortId, {
                method: 'DELETE',
                headers: {
                  'x-admin-token': token
                }
              });

              if (!response.ok) {
                throw new Error('Failed to delete URL');
              }

              loadUrls();
            } catch (error) {
              console.error('Delete URL error:', error);
              showError('Failed to delete URL: ' + error.message);
            }
          }

          async function logout() {
            try {
              await fetch('/admin/logout', {
                method: 'POST',
                headers: {
                  'x-admin-token': token
                }
              });
            } catch (error) {
              console.error('Logout error:', error);
            } finally {
              localStorage.removeItem('adminToken');
              window.location.href = '/admin';
            }
          }

          function showError(message) {
            const errorDiv = document.getElementById('error-message');
            errorDiv.style.display = 'block';
            errorDiv.textContent = message;
          }

          // Load URLs when page loads
          loadUrls();
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Dashboard page error:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Keep existing routes
app.post('/shorten', (req, res) => {
  try {
    const { originalUrl, password, username } = req.body;

    if (!originalUrl || !password || !username) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const shortId = nanoid(6);
    urlDatabase[shortId] = {
      originalUrl,
      password,
      username,
      clicks: 0,
    };

    res.json({ shortUrl: `https://${req.headers.host}/${shortId}` });
  } catch (error) {
    console.error('Shorten URL error:', error);
    res.status(500).json({ error: 'Failed to create short URL' });
  }
});

app.get('/:shortId', (req, res) => {
  try {
    const { shortId } = req.params;
    const entry = urlDatabase[shortId];

    if (!entry) {
      return res.status(404).send('URL not found');
    }

    entry.clicks++;
    res.redirect(entry.originalUrl.startsWith('http') ? entry.originalUrl : `https://${entry.originalUrl}`);
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).send('Error redirecting to URL');
  }
});

module.exports = app;

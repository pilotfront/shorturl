const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');
const crypto = require('crypto');
const session = require('express-session');

const app = express();
const urlDatabase = {}; // In-memory storage for shortened URLs

// Session configuration
const sessionConfig = {
  secret: crypto.randomBytes(32).toString('hex'), // Random session secret on each server start
  name: 'sessionId', // Custom session cookie name
  cookie: {
    httpOnly: true, // Prevents client-side access to cookie
    secure: true, // Only transmitted over HTTPS
    sameSite: 'strict', // Protects against CSRF
    maxAge: 1800000 // 30 minutes session timeout
  },
  resave: false,
  saveUninitialized: false
};

// Enable CORS for specific domains
const corsOptions = {
  origin: 'https://www.pilotfront.com',
  methods: 'GET,POST, DELETE',
  allowedHeaders: 'Content-Type',
  credentials: true // Required for cookies
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(session(sessionConfig));

// Constant-time string comparison to prevent timing attacks
const secureCompare = (a, b) => {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

// Generate a strong hash for password comparison
const hashPassword = (password) => {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
};

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const urlPassword = req.query.password;
  
  // Allow URL-based authentication to maintain compatibility
  if (urlPassword && secureCompare(hashPassword(urlPassword), hashPassword('abc'))) {
    req.session.isAuthenticated = true;
    return next();
  }
  
  // Check session authentication
  if (req.session.isAuthenticated) {
    return next();
  }

  // If no valid authentication, check for AJAX request
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.status(403).json({ error: 'Authentication required' });
  }

  // Show login page
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Login</title>
      <style>
        .login-container {
          max-width: 400px;
          margin: 50px auto;
          padding: 20px;
          border: 1px solid #ccc;
          border-radius: 5px;
        }
        .error { color: red; display: none; }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h2>Admin Login</h2>
        <div id="error" class="error"></div>
        <form id="loginForm">
          <input type="password" id="password" placeholder="Enter password" required>
          <button type="submit">Login</button>
        </form>
      </div>
      <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const password = document.getElementById('password').value;
          
          try {
            const response = await fetch('/admin/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ password }),
              credentials: 'include'
            });
            
            if (response.ok) {
              window.location.href = '/admin';
            } else {
              const error = await response.json();
              document.getElementById('error').textContent = error.message;
              document.getElementById('error').style.display = 'block';
            }
          } catch (err) {
            document.getElementById('error').textContent = 'An error occurred';
            document.getElementById('error').style.display = 'block';
          }
        });
      </script>
    </body>
    </html>
  `);
};

// Login endpoint
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (secureCompare(hashPassword(password), hashPassword('abc'))) {
    req.session.isAuthenticated = true;
    res.json({ success: true });
  } else {
    res.status(403).json({ message: 'Invalid password' });
  }
});

// Logout endpoint
app.post('/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Protected admin route
app.get('/admin', authenticateAdmin, (req, res) => {
  let html = '<h1>Admin Page</h1>';
  html += '<div style="text-align: right;"><button onclick="logout()">Logout</button></div>';
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
          credentials: 'include'
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
        fetch('/delete/' + shortId, { 
          method: 'DELETE',
          credentials: 'include'
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

      function logout() {
        fetch('/admin/logout', {
          method: 'POST',
          credentials: 'include'
        })
        .then(() => window.location.href = '/admin');
      }
    </script>
  `;

  res.send(html);
});

// Rest of your routes remain unchanged...

module.exports = app;

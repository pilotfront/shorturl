const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const urlDatabase = {}; // In-memory storage for shortened URLs

// Admin password
const ADMIN_PASSWORD = "abc";

// Enable CORS for specific domains
const corsOptions = {
  origin: ['https://www.pilotfront.com', 'https://www.pilotfront.click'], // Allow both domains
  methods: 'GET,POST,DELETE',
  allowedHeaders: 'Content-Type',
};


// Middleware
app.use(cors(corsOptions)); // Apply CORS settings
app.use(express.json()); // Parse JSON body



// Serve Admin Page Dynamically (instead of using sendFile)
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Page</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
        }
        .hidden {
          display: none;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f4f4f4;
        }
        button {
          padding: 5px 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .delete-btn {
          background-color: red;
          color: white;
        }
        .form-container {
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <h1>Admin Dashboard</h1>
      <div class="form-container">
        <label for="admin-password">Enter Admin Password:</label>
        <input type="password" id="admin-password">
        <button id="login-btn">Login</button>
      </div>
      <div id="error-message" style="color: red;"></div>
      <div id="admin-content" class="hidden">
        <table>
          <thead>
            <tr>
              <th>Short URL</th>
              <th>Original URL</th>
              <th>Username</th>
              <th>Password</th>
              <th>Clicks</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="url-table-body"></tbody>
        </table>
      </div>

      <script>
        const adminPassword = 'abc'; // Admin password (must match server-side)

        document.getElementById('login-btn').addEventListener('click', () => {
          const passwordInput = document.getElementById('admin-password').value;
          const errorMessage = document.getElementById('error-message');
          const adminContent = document.getElementById('admin-content');

          errorMessage.textContent = '';

          if (passwordInput === adminPassword) {
            fetch('/admin/list?password=' + adminPassword)
              .then(response => response.json())
              .then(data => {
                if (data.error) {
                  errorMessage.textContent = data.error;
                } else {
                  adminContent.classList.remove('hidden');
                  populateTable(data);
                }
              })
              .catch(err => {
                console.error('Error fetching admin data:', err);
                errorMessage.textContent = 'Failed to fetch data.';
              });
          } else {
            errorMessage.textContent = 'Invalid password.';
          }
        });

        function populateTable(data) {
          const tableBody = document.getElementById('url-table-body');
          tableBody.innerHTML = '';

          data.forEach(item => {
            const row = document.createElement('tr');

            row.innerHTML = `
              <td><a href="/${item.shortId}" target="_blank">${item.shortId}</a></td>
              <td><a href="${item.originalUrl}" target="_blank">${item.originalUrl}</a></td>
              <td>${item.username}</td>
              <td>${item.password}</td>
              <td>${item.clicks}</td>
              <td><button class="delete-btn" data-shortid="${item.shortId}">Delete</button></td>
            `;

            tableBody.appendChild(row);
          });

          document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', () => {
              const shortId = button.getAttribute('data-shortid');
              deleteUrl(shortId);
            });
          });
        }

        function deleteUrl(shortId) {
          fetch(`/delete/${shortId}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
              alert(data.message);
              document.getElementById('login-btn').click(); // Refresh data
            })
            .catch(err => {
              console.error('Error deleting URL:', err);
            });
        }
      </script>
    </body>
    </html>
  `);
});



// Home Route
app.get('/', (req, res) => {
  res.send('<h1>URL Shortener</h1><p>Use POST /shorten to create a short URL.</p>');
});



// Shorten a URL
app.post('/shorten', (req, res) => {
  const { originalUrl, username, password } = req.body;

  // Validate input
  if (!originalUrl || !password || !username) {
    return res.status(400).json({ error: 'You must provide a URL, username, and password!' });
  }

  // Generate short ID and save to database
  const shortId = nanoid(6);
  urlDatabase[shortId] = {
    originalUrl,
    username,
    password,
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
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required!' });
  }

  const urls = Object.entries(urlDatabase)
    .filter(([key, value]) => value.username === username && value.password === password)
    .map(([shortId, data]) => ({
      shortId,
      originalUrl: data.originalUrl,
      clicks: data.clicks,
    }));

  res.json(urls);
});

// Admin Route to Fetch All URLs
app.get('/admin/list', (req, res) => {
  try {
    const { password } = req.query;

    if (!password) {
      return res.status(400).json({ error: 'Password is required!' });
    }

    if (password !== ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Invalid admin password!' });
    }

    const allUrls = Object.entries(urlDatabase).map(([shortId, data]) => ({
      shortId,
      originalUrl: data.originalUrl,
      username: data.username,
      password: data.password,
      clicks: data.clicks,
    }));

    res.json(allUrls);
  } catch (err) {
    console.error('Error fetching admin list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Admin Route to Delete URLs
app.delete('/admin/delete/:shortId', (req, res) => {
  const { password } = req.query;
  const { shortId } = req.params;

  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Invalid admin password!' });
  }

  // Check if the URL exists
  if (!urlDatabase[shortId]) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  // Delete the URL from the database
  delete urlDatabase[shortId];

  res.json({ message: 'URL deleted successfully' });
});



const path = require('path');

// Serve admin.html for /admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});



// Start the server
module.exports = app;

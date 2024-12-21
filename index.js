const express = require('express');
const path = require('path');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const urlDatabase = {}; // In-memory storage for URLs (to simulate database)

// Enable CORS for specific domains
const corsOptions = {
  origin: 'https://www.pilotfront.com', // Allow requests only from your Webflow domain
  methods: 'GET,POST, DELETE',
  allowedHeaders: 'Content-Type',
};

// Middleware
app.use(cors(corsOptions)); // Apply CORS settings
app.use(express.json()); // Parse JSON body

// Password for admin access
const adminPassword = 'abc';

// Endpoint to display admin page
app.get('/admin', (req, res) => {
  // Check if the password is provided
  const password = req.query.password;

  if (password !== adminPassword) {
    return res.status(403).send('Forbidden: Invalid password');
  }

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
        table {
          width: 100%;
          border-collapse: collapse;
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
          background-color: red;
          color: white;
          cursor: pointer;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <h1>Admin Dashboard</h1>
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
      <script>
        fetch('/admin/list')
          .then(response => response.json())
          .then(data => {
            const tableBody = document.getElementById('url-table-body');
            tableBody.innerHTML = '';
            data.forEach(item => {
              const row = document.createElement('tr');
              row.innerHTML = \`
                <td><a href="/\${item.shortId}" target="_blank">\${item.shortId}</a></td>
                <td><a href="\${item.originalUrl}" target="_blank">\${item.originalUrl}</a></td>
                <td>\${item.username}</td>
                <td>\${item.password}</td>
                <td>\${item.clicks}</td>
                <td><button onclick="deleteUrl('\${item.shortId}')">Delete</button></td>
              \`;
              tableBody.appendChild(row);
            });
          })
          .catch(err => console.error('Error fetching URL data:', err));

        function deleteUrl(shortId) {
          fetch('/delete/' + shortId, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
              alert(data.message);
              location.reload(); // Reload page to update the list
            })
            .catch(err => console.error('Error deleting URL:', err));
        }
      </script>
    </body>
    </html>
  `);
});

// Endpoint to get all URLs for the admin
app.get('/admin/list', (req, res) => {
  res.json(Object.values(urlDatabase));
});

// Endpoint to delete a URL by shortId
app.delete('/delete/:shortId', (req, res) => {
  const { shortId } = req.params;
  if (urlDatabase[shortId]) {
    delete urlDatabase[shortId];
    return res.json({ message: 'URL deleted successfully' });
  } else {
    return res.status(404).json({ error: 'URL not found' });
  }
});

// Simulate URL creation (just for example)
app.post('/shorten', (req, res) => {
  const { originalUrl, username, password } = req.body;
  const shortId = nanoid(6);
  urlDatabase[shortId] = { shortId, originalUrl, username, password, clicks: 0 };

  res.json({ shortUrl: `https://www.pilotfront.click/${shortId}` });
});

// Handle redirect
app.get('/:shortId', (req, res) => {
  const { shortId } = req.params;
  if (urlDatabase[shortId]) {
    urlDatabase[shortId].clicks += 1;
    res.redirect(urlDatabase[shortId].originalUrl);
  } else {
    res.status(404).send('Not Found');
  }
});

// Start the server (for Vercel, this is necessary to run the serverless function)
module.exports = app;

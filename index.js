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

// Modified Admin Route with Password Popup
app.get('/admin', (req, res) => {
  let html = `
    <h1>Admin Login</h1>
    <div id="password-prompt">
      <script>
        function checkPassword() {
          const password = prompt('Please enter admin password:');
          if (password === 'abc') {
            document.getElementById('admin-content').style.display = 'block';
            document.getElementById('password-prompt').style.display = 'none';
          } else {
            alert('Invalid password');
            window.location.href = '/';
          }
        }
        window.onload = checkPassword;
      </script>
    </div>
    <div id="admin-content" style="display: none;">
      <h1>Admin Page</h1>
      <h2>All URLs</h2>
      <table border="1">
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
    </div>
  `;

  res.send(html);
});

// Rest of the code remains unchanged...

module.exports = app;

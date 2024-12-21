const express = require('express');
const session = require('express-session');
const app = express();
const port = process.env.PORT || 3000;

// Example URL database (replace with your actual database)
const urlDatabase = {};

// Set up middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',  // Use a strong secret key for signing the session ID cookie
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Set secure cookies in production
  },
}));

// Serve the homepage (can be customized)
app.get('/', (req, res) => {
  res.send('<h1>Welcome to the URL Shortener!</h1>');
});

// Admin Login Route (password prompt)
app.get('/admin', (req, res) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/admin/dashboard'); // Redirect to dashboard if authenticated
  }

  res.send(`
    <script>
      const password = prompt("Enter the admin password:");

      if (password !== 'abc') {
        alert('Invalid password.');
        window.location.href = '/'; // Redirect to home if password is invalid
      } else {
        fetch('/admin/authenticate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password })
        })
        .then(() => {
          window.location.href = '/admin/dashboard'; // Redirect to dashboard if password is correct
        })
        .catch(() => {
          alert('An error occurred.');
        });
      }
    </script>
  `);
});

// Admin Authentication Route (to set session if password is correct)
app.post('/admin/authenticate', (req, res) => {
  const { password } = req.body;

  if (password === 'abc') {
    req.session.isAuthenticated = true;  // Set session to indicate authentication
    return res.status(200).send();  // Respond with success
  }

  res.status(403).send('Invalid password');  // Invalid password
});

// Admin Dashboard Route (protected)
app.get('/admin/dashboard', (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect('/admin');  // If not authenticated, redirect to login page
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

  res.send(html);  // Send the admin dashboard content
});

// URL Creation Route (handle creation of short URLs)
app.post('/create-custom-short-url', (req, res) => {
  const { shortId, originalUrl, username, password } = req.body;

  if (!shortId || !originalUrl || !username || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Add the new URL to the database (simplified example)
  urlDatabase[shortId] = {
    originalUrl,
    username,
    password,
    clicks: 0, // Initialize click count
  };

  res.json({ shortUrl: `https://${req.headers.host}/${shortId}` });
});

// Delete URL Route
app.delete('/delete/:shortId', (req, res) => {
  const { shortId } = req.params;
  
  if (urlDatabase[shortId]) {
    delete urlDatabase[shortId];
    return res.json({ message: 'URL deleted successfully' });
  }
  
  res.status(404).json({ error: 'URL not found' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

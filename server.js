const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const dataPath = path.join(__dirname, 'urls.json');

// Middleware
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files (HTML, CSS, JS)

// Function to generate a 3-character random string for shortening
const generateShortId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Load existing URLs from file
const loadUrls = () => {
  try {
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf-8').trim();
      return data ? JSON.parse(data) : {};
    }
    return {};
  } catch (error) {
    console.error('Error reading or parsing urls.json:', error);
    return {};
  }
};

// Save URLs to the JSON file
const saveUrls = (data) => {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('URLs saved successfully to urls.json');
  } catch (error) {
    console.error('Error writing to urls.json:', error);
  }
};

// API to shorten a URL
app.post('/shorten', (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ error: 'Original URL is required' });
  }

  const urls = loadUrls();

  let id;
  do {
    id = generateShortId();
  } while (urls[id]); // Ensure the ID is unique

  const shortUrl = `https://${req.get('host')}/${id}`; // Uses the default Vercel domain
  urls[id] = { originalUrl, shortUrl }; // Store the URL object with both URLs
  saveUrls(urls); // Save to file

  res.json({ shortUrl });
});

// API to retrieve all shortened URLs
app.get('/urls', (req, res) => {
  const urls = loadUrls();
  res.json(urls);
});

// API to delete a URL by its short ID
app.delete('/delete/:id', (req, res) => {
  const { id } = req.params;
  const urls = loadUrls();

  if (urls[id]) {
    delete urls[id];
    saveUrls(urls); // Save the updated list
    res.json({ success: true, message: `URL with ID ${id} deleted` });
  } else {
    res.status(404).json({ error: `URL with ID ${id} not found` });
  }
});

// Redirect to the original URL by short ID
app.get('/:id', (req, res) => {
  const urls = loadUrls();
  const originalUrl = urls[req.params.id]?.originalUrl;

  if (originalUrl) {
    res.redirect(originalUrl);
  } else {
    res.status(404).send('URL not found');
  }
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

module.exports = app;

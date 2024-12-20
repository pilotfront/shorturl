const express = require("express");
const { nanoid } = require("nanoid");

const app = express();
const port = process.env.PORT || 3000;

const urlDatabase = {}; // In-memory storage for short URLs

app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send(`
    <h1>Welcome to the URL Shortener</h1>
    <p>Use the API to shorten your URLs:</p>
    <ul>
      <li><strong>POST /shorten</strong> - Shorten a URL</li>
      <li><strong>GET /:shortId</strong> - Redirect to the original URL</li>
    </ul>
  `);
});

// API to shorten a URL
app.post("/shorten", (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl) {
    return res.status(400).send({ error: "Original URL is required" });
  }

  const shortId = nanoid(6); // Generate unique ID
  urlDatabase[shortId] = originalUrl;

  res.send({ shortUrl: `${req.protocol}://${req.get("host")}/${shortId}` });
});

// Redirect to the original URL
app.get("/:shortId", (req, res) => {
  const { shortId } = req.params;
  const originalUrl = urlDatabase[shortId];

  if (!originalUrl) {
    return res.status(404).send({ error: "URL not found" });
  }

  res.redirect(originalUrl);
});

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).send("404: Page not found");
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

const express = require("express");
const { nanoid } = require("nanoid");

const app = express();
const port = process.env.PORT || 3000;

const urlDatabase = {}; // In-memory database for simplicity

app.use(express.json());

// Route to shorten a URL
app.post("/shorten", (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl) {
    return res.status(400).send({ error: "Original URL is required" });
  }

  const shortId = nanoid(6); // Generate a unique ID
  urlDatabase[shortId] = originalUrl;

  res.send({ shortUrl: `${req.protocol}://${req.get("host")}/${shortId}` });
});

// Route to redirect to the original URL
app.get("/:shortId", (req, res) => {
  const { shortId } = req.params;
  const originalUrl = urlDatabase[shortId];

  if (!originalUrl) {
    return res.status(404).send({ error: "URL not found" });
  }

  res.redirect(originalUrl);
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

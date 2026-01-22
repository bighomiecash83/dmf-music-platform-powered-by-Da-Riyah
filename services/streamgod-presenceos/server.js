const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "streamgod-presenceos" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 8002;
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`StreamGod PresenceOS listening on http://${host}:${port}`);
});

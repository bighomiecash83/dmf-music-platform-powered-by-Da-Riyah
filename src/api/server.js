const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "api" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 8080;
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`API service listening on http://${host}:${port}`);
});

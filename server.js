import express from "express";
import os from "node:os";
import Anthropic from "@anthropic-ai/sdk";
import { analyze, isDemo, BACKEND } from "./lib/analyze.js";
import { compare } from "./lib/compare.js";

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use(express.static("public"));

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGES = 4;

app.get("/api/status", (_req, res) => {
  res.json({ demo: isDemo() });
});

app.post("/api/analyze", async (req, res) => {
  const { images, lang = "ja" } = req.body ?? {};
  if (!Array.isArray(images) || images.length === 0 || images.length > MAX_IMAGES) {
    return res.status(400).json({ error: "bad_images" });
  }
  for (const img of images) {
    if (!img || !ALLOWED_TYPES.has(img.media_type) || typeof img.data !== "string" || !img.data) {
      return res.status(400).json({ error: "bad_images" });
    }
  }
  try {
    res.json(await analyze(images, lang));
  } catch (err) {
    sendError(res, err);
  }
});

app.post("/api/compare", async (req, res) => {
  const { items, goal = "", lang = "ja" } = req.body ?? {};
  if (!Array.isArray(items) || items.length < 2 || items.length > 4 || items.some((i) => !i?.result?.product)) {
    return res.status(400).json({ error: "bad_compare" });
  }
  try {
    res.json(await compare(items, String(goal).slice(0, 200), lang));
  } catch (err) {
    sendError(res, err);
  }
});

function sendError(res, err) {
  if (["timeout", "cli_missing", "cli_failed"].includes(err.code)) {
    return res.status(502).json({ error: err.code });
  }
  if (err.code === "refusal" || err.code === "incomplete") {
    return res.status(422).json({ error: err.code });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return res.status(429).json({ error: "rate_limited" });
  }
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("Authentication failed: check ANTHROPIC_API_KEY");
    return res.status(500).json({ error: "server_auth" });
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`Claude API error ${err.status}:`, err.message);
    return res.status(502).json({ error: "upstream" });
  }
  console.error(err);
  res.status(500).json({ error: "internal" });
}

const port = Number(process.env.PORT) || 3000;
app.listen(port, (err) => {
  // Express 5 reports startup errors here instead of throwing, so handle them explicitly.
  if (err) {
    if (err.code === "EADDRINUSE") {
      console.error(`ポート${port}はすでに使われています。別のターミナルでミエールが動いていないか確認し、そちらを control + C で止めてください。`);
      console.error(`Port ${port} is already in use. Stop the other Mieru window, or start with PORT=${port + 1} npm start.`);
    } else {
      console.error("起動できませんでした / Failed to start:", err.message);
    }
    process.exit(1);
  }
  const mode = isDemo() ? "demo" : BACKEND === "cli" ? "claude -p (subscription)" : "API key";
  console.log(`Mieru: http://localhost:${port}  [${mode}]`);
  // Show the address to open on a phone connected to the same Wi-Fi.
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .filter((a) => a && a.family === "IPv4" && !a.internal)
    .map((a) => `http://${a.address}:${port}`);
  if (lan.length) console.log(`iPhone / スマホ（同じWi-Fi）: ${lan.join("  ")}`);
});

import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { analyze, isDemo, BACKEND } from "./lib/analyze.js";

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
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  const mode = isDemo() ? "demo" : BACKEND === "cli" ? "claude -p (subscription)" : "API key";
  console.log(`Label Lens: http://localhost:${port}  [${mode}]`);
});

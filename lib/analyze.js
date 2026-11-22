import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AnalysisSchema } from "./schema.js";
import { finalize as finalizeResult } from "../public/finalize.js";
import { ANALYZE_SYSTEM as SYSTEM, LANG_NAMES } from "../public/prompts.js";
import { demoResult } from "./demo.js";
import { runClaudeCli } from "./cli.js";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";



let client;
function getClient() {
  client ??= new Anthropic();
  return client;
}

// "cli" (default): Claude Code headless mode on your subscription. "api": paid API key.
export const BACKEND = process.env.ANALYZER === "api" ? "api" : "cli";

export function isDemo() {
  if (process.env.DEMO_MODE === "1") return true;
  if (BACKEND === "api") return !(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  return false;
}

/**
 * @param {{ media_type: string, data: string }[]} images base64 images
 * @param {string} lang one of ja/en/zh/ko
 */
export async function analyze(images, lang) {
  const outLang = LANG_NAMES[lang] ?? "Japanese";

  if (isDemo()) {
    return finalizeResult(demoResult(lang), lang, { demo: true });
  }

  const content = [
    ...images.map((img, i) => [
      { type: "text", text: `Photo ${i + 1}:` },
      { type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } },
    ]).flat(),
    {
      type: "text",
      text: `Analyse this product. Output language: ${outLang}.`,
    },
  ];

  if (BACKEND === "cli") {
    return finalizeResult(await runClaudeCli({ system: SYSTEM, content }), lang, { demo: false });
  }

  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "medium", format: betaZodOutputFormat(AnalysisSchema) },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    const err = new Error("refusal");
    err.code = "refusal";
    throw err;
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    const err = new Error("incomplete");
    err.code = "incomplete";
    throw err;
  }
  return finalizeResult(response.parsed_output, lang, { demo: false });
}

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AnalysisSchema } from "./schema.js";
import { checkRules } from "./rules.js";
import { demoResult } from "./demo.js";
import { runClaudeCli } from "./cli.js";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

const LANG_NAMES = { ja: "Japanese", en: "English", zh: "Simplified Chinese", ko: "Korean" };

const SYSTEM = `You analyse photos of cosmetics, skincare, supplements and similar consumer products
(front of package and/or back label) for a consumer who wants to know what is in the product and
whether there is anything to be careful about. Many products were bought abroad or received as
souvenirs, so labels may be in any language; read them all.

How to work:
- Read every photo. Identify the product, brand, category and country of origin from what is printed
  (barcode prefix, address, language, regulatory marks). Do not invent facts that are not visible;
  if you infer something, say it is an inference.
- Transcribe the ingredient list in label order. Give each ingredient its standard English/INCI name,
  a name in the output language, its purpose and a level:
  safe = well established, no concern at normal use; low = minor, e.g. mild irritant for some;
  caution = known allergen/irritant, or concentration matters; warning = restricted, or treated as a
  medicine in Japan; danger = prohibited or associated with serious harm; unknown = cannot assess.
- Judge from the viewpoint of Japanese regulations (化粧品基準, 薬機法, food vs. medicine classification,
  personal-import guidelines: cosmetics up to 24 units per item, medicines/quasi-drugs up to 2 months'
  supply) as well as general safety evidence. Mention when something is normal abroad but restricted in Japan.
- Be calibrated: do not scare people about well-studied ingredients (e.g. common preservatives at legal
  levels). Do not call a product "safe" with certainty either; say what the evidence supports.
- If no ingredient list is visible, set readable accordingly, analyse what you can from the front, and
  ask in "missing" for a photo of the back label.
- This is general information, not medical advice. For people who are pregnant, have conditions or take
  medicines, recommend asking a pharmacist or doctor where relevant.

Write every human-readable field in the output language given by the user.`;

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
    return finalize(demoResult(lang), lang, { demo: true });
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
    return finalize(await runClaudeCli({ system: SYSTEM, content }), lang, { demo: false });
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
  return finalize(response.parsed_output, lang, { demo: false });
}

const RANK = { safe: 0, low: 1, unknown: 1, caution: 2, warning: 3, danger: 4 };

function finalize(result, lang, meta) {
  const hits = checkRules(result.ingredients, [result.product.name]);
  // A rule hit can raise the overall level but never lower what the model said.
  let level = result.overall.level;
  for (const h of hits) if (RANK[h.level] > RANK[level]) level = h.level;
  return {
    ...result,
    overall: { ...result.overall, level },
    rule_hits: hits.map((h) => ({ id: h.id, level: h.level, matched: h.matched, message: h.msg[lang] ?? h.msg.ja })),
    meta,
  };
}

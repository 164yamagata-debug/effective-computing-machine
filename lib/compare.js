import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CompareSchema } from "./schema.js";
import { runClaudeCli } from "./cli.js";
import { BACKEND, isDemo } from "./analyze.js";
import { computeScore } from "../public/score.js";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const LANG_NAMES = { ja: "Japanese", en: "English", zh: "Simplified Chinese", ko: "Korean" };

const SYSTEM = `You help a consumer in Japan choose between several supplements, health foods or cosmetics.
You receive earlier label analyses of each product (as JSON) and optionally prices and the user's goal.
Compare them fairly and concretely:
- Main active ingredients and their daily amounts; whether the amounts are meaningful.
- Label type and strength of evidence (トクホ and 機能性表示食品 have more backing than いわゆる健康食品).
- Safety: restricted ingredients, interactions with medicines, allergens, excess intake.
- Price per day if prices are given.
- Overlap: taking several of them together can double up on the same nutrient.
Do not invent facts that are not in the analyses. If something important is unknown, say so.
This is general information, not medical advice; suggest a pharmacist or doctor where relevant.
Write every human-readable field in the output language given by the user.`;

let client;

// Keep only what the comparison needs, so the prompt stays small.
function slim(item) {
  const r = item.result ?? {};
  return {
    name: r.product?.name,
    brand: r.product?.brand,
    category: r.product?.category,
    origin: r.product?.origin_country,
    overall: r.overall,
    mieru_score: computeScore(r).score ?? "no ingredient list",
    label_type: r.food_label?.type,
    label_note: r.food_label?.explanation,
    claims_check: r.claims_check || undefined,
    supply: r.supply,
    price_yen: item.price || undefined,
    price_per_day_yen: item.price && r.supply?.days ? Math.round(item.price / r.supply.days) : undefined,
    ingredients: (r.ingredients ?? []).map((i) => ({ name: i.english || i.original, level: i.level, note: i.note })),
    intake: r.intake,
    interactions: r.interactions,
    allergens: r.allergens?.map((a) => a.name),
    rule_hits: r.rule_hits?.map((h) => h.id),
    japan_notes: r.japan_notes?.map((n) => n.title),
  };
}

export async function compare(items, goal, lang) {
  if (isDemo()) return demoCompare(items, lang);

  const outLang = LANG_NAMES[lang] ?? "Japanese";
  const text = `Products:\n${JSON.stringify(items.map(slim), null, 1)}\n\nUser's goal: ${goal || "(not given)"}\nOutput language: ${outLang}.`;
  const content = [{ type: "text", text }];

  if (BACKEND === "cli") {
    return runClaudeCli({ system: SYSTEM, content, schema: CompareSchema });
  }

  client ??= new Anthropic();
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "medium", format: betaZodOutputFormat(CompareSchema) },
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal") throw Object.assign(new Error("refusal"), { code: "refusal" });
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw Object.assign(new Error("incomplete"), { code: "incomplete" });
  }
  return response.parsed_output;
}

function demoCompare(items, lang) {
  const names = items.map((i) => i.result?.product?.name ?? "?");
  const ja = lang === "ja";
  return {
    summary: ja
      ? `（デモ）${names.join("、")} を比較したサンプルです。実際の比較はデモモードを外すと表示されます。`
      : `(demo) Sample comparison of ${names.join(", ")}. Start without DEMO_MODE for a real comparison.`,
    best_for: [{ situation: ja ? "（デモ）" : "(demo)", choice: names[0], reason: ja ? "サンプルです" : "Sample only" }],
    differences: [],
    overlap: "",
    cautions: [],
  };
}

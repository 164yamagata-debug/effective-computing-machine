// claude.ai artifact backend: Claude is asked through the page's `sample` capability, on the
// viewer's own Claude plan (no API key, no server). PROMPTS is injected by build.mjs.
import { ANALYZE_SYSTEM, COMPARE_SYSTEM, LANG_NAMES } from "../public/prompts.js";
import { finalize } from "../public/finalize.js";
import { slimForCompare } from "../public/compare-data.js";

const samplePromise = window.claude?.use ? window.claude.use("sample") : Promise.resolve(null);

const LEVELS = ["safe", "low", "caution", "warning", "danger", "unknown"];
const lvl = (v) => (LEVELS.includes(v) ? v : "unknown");
const str = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

function b64ToBlob({ media_type, data }) {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: media_type });
}

async function ask(prompt, options) {
  const sample = await samplePromise;
  if (!sample) throw new Error("unavailable");
  try {
    return await sample.json(prompt, options);
  } catch (e) {
    throw new Error(e?.code || "default");
  }
}

// The model's JSON is not validated by the platform, so fill in anything missing.
function normalizeAnalysis(raw) {
  const r = obj(raw);
  const p = obj(r.product);
  const ingredients = arr(r.ingredients).map((i) => {
    const o = obj(i);
    return { original: str(o.original), english: str(o.english), name: str(o.name || o.original), purpose: str(o.purpose), level: lvl(o.level), note: str(o.note) };
  });
  return {
    readable: typeof r.readable === "boolean" ? r.readable : ingredients.length > 0,
    product: {
      name: str(p.name), brand: str(p.brand), category: str(p.category) || "unknown",
      origin_country: str(p.origin_country), label_languages: arr(p.label_languages).map(str),
    },
    supply: { per_day: str(obj(r.supply).per_day), days: Number(obj(r.supply).days) || 0 },
    overall: { level: lvl(obj(r.overall).level), summary: str(obj(r.overall).summary) },
    food_label: { type: str(obj(r.food_label).type) || "unknown", notification_number: str(obj(r.food_label).notification_number), explanation: str(obj(r.food_label).explanation) },
    allergens: arr(r.allergens).map((a) => ({ name: str(obj(a).name), kind: ["mandatory", "recommended"].includes(obj(a).kind) ? obj(a).kind : "other", source: str(obj(a).source) })).filter((a) => a.name),
    intake: arr(r.intake).map((n) => ({ nutrient: str(obj(n).nutrient), amount: str(obj(n).amount), level: lvl(obj(n).level), detail: str(obj(n).detail) })),
    interactions: arr(r.interactions).map((n) => ({ substance: str(obj(n).substance), with_what: str(obj(n).with_what), level: lvl(obj(n).level), detail: str(obj(n).detail) })),
    ingredients,
    japan_notes: arr(r.japan_notes).map((n) => ({ title: str(obj(n).title), level: lvl(obj(n).level), detail: str(obj(n).detail) })),
    cautions: arr(r.cautions).map((c) => ({ title: str(obj(c).title), who: str(obj(c).who), detail: str(obj(c).detail) })),
    claims_problem: r.claims_problem === true,
    claims_check: str(r.claims_check),
    confidence: ["high", "medium", "low"].includes(r.confidence) ? r.confidence : "medium",
    missing: str(r.missing),
  };
}

export const api = {
  async analyze(images, lang) {
    const prompt = `${ANALYZE_SYSTEM}

The ${images.length} attached image(s) are photos of ONE product (front, back label / ingredient list, other sides).
Analyse this product. Output language: ${LANG_NAMES[lang] ?? "Japanese"}.

Reply with only one JSON object that follows this JSON Schema (descriptions explain each field). No other text.
${PROMPTS.analysisSchema}`;
    const raw = await ask(prompt, { images: images.map(b64ToBlob) });
    return finalize(normalizeAnalysis(raw), lang, { demo: false });
  },

  async compare(items, goal, lang) {
    const prompt = `${COMPARE_SYSTEM}

Products:
${JSON.stringify(items.map(slimForCompare), null, 1)}

User's goal: ${goal || "(not given)"}
Output language: ${LANG_NAMES[lang] ?? "Japanese"}.

Reply with only one JSON object that follows this JSON Schema. No other text.
${PROMPTS.compareSchema}`;
    const r = obj(await ask(prompt, { cache: false }));
    return {
      summary: str(r.summary),
      best_for: arr(r.best_for).map((b) => ({ situation: str(obj(b).situation), choice: str(obj(b).choice), reason: str(obj(b).reason) })),
      differences: arr(r.differences).map((d) => ({ aspect: str(obj(d).aspect), detail: str(obj(d).detail) })),
      overlap: str(r.overlap),
      cautions: arr(r.cautions).map(str),
    };
  },

  async isDemo() {
    return false;
  },
};

import { checkRules, detectAllergens, mergeAllergens } from "./rules.js";

const LEVEL_RANK = { safe: 0, low: 1, unknown: 1, caution: 2, warning: 3, danger: 4 };

// Add the rule-based Japan checks and keyword allergen detection to an AI result.
export function finalize(result, lang, meta) {
  const hits = checkRules(result.ingredients, [result.product.name]);
  const allergens = mergeAllergens(result.allergens, detectAllergens(result.ingredients), lang);
  // A rule hit can raise the overall level but never lower what the model said.
  let level = result.overall.level;
  for (const h of hits) if (LEVEL_RANK[h.level] > LEVEL_RANK[level]) level = h.level;
  return {
    ...result,
    overall: { ...result.overall, level },
    allergens,
    rule_hits: hits.map((h) => ({ id: h.id, level: h.level, matched: h.matched, message: h.msg[lang] ?? h.msg.ja })),
    meta,
  };
}

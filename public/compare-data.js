import { computeScore } from "./score.js";

// Keep only what the comparison needs, so the prompt stays small.
export function slimForCompare(item) {
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

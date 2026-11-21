// Mieru score: 0-100, higher = fewer concerns. Computed with a fixed formula from the
// per-ingredient levels (never asked from the AI), so the same analysis always gives the
// same score. Shared by the server and the browser.

const PENALTY = { danger: 40, warning: 20, caution: 8, low: 2, safe: 0, unknown: 0 };
const RANK = { safe: 0, low: 1, unknown: 1, caution: 2, warning: 3, danger: 4 };
// One serious ingredient caps the score no matter how clean the rest is.
const CAP = { danger: 20, warning: 50 };

export const GRADES = [
  { min: 80, grade: "A" },
  { min: 60, grade: "B" },
  { min: 40, grade: "C" },
  { min: 20, grade: "D" },
  { min: 0, grade: "E" },
];

/**
 * @returns {{ score: number|null, grade: string|null, deductions: {label: string, level: string, points: number}[] }}
 * score is null when there is no ingredient list to judge.
 */
export function computeScore(result) {
  const ingredients = result?.ingredients ?? [];
  if (!result?.readable || ingredients.length === 0) return { score: null, grade: null, deductions: [] };

  // A rule hit (Japan check) raises the level of the ingredient it matched.
  const ruleLevel = new Map();
  for (const h of result.rule_hits ?? []) {
    if (RANK[h.level] > RANK[ruleLevel.get(h.matched) ?? "safe"]) ruleLevel.set(h.matched, h.level);
  }
  const matchedTexts = new Set();

  const deductions = [];
  let worst = "safe";
  for (const i of ingredients) {
    let level = i.level;
    for (const text of [i.original, i.english, i.name]) {
      const r = ruleLevel.get(text);
      if (r) {
        matchedTexts.add(text);
        if (RANK[r] > RANK[level]) level = r;
      }
    }
    if (RANK[level] > RANK[worst]) worst = level;
    if (PENALTY[level]) deductions.push({ label: i.name || i.original, level, points: PENALTY[level] });
  }
  // Rule hits that did not match an ingredient (e.g. found in the product name).
  for (const h of result.rule_hits ?? []) {
    if (!matchedTexts.has(h.matched) && PENALTY[h.level]) {
      deductions.push({ label: h.matched, level: h.level, points: PENALTY[h.level] });
      if (RANK[h.level] > RANK[worst]) worst = h.level;
    }
  }
  if (result.claims_check) deductions.push({ label: "claims", level: "caution", points: 5 });

  let score = 100 - deductions.reduce((sum, d) => sum + d.points, 0);
  if (CAP[worst] !== undefined) score = Math.min(score, CAP[worst]);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = GRADES.find((g) => score >= g.min).grade;
  deductions.sort((a, b) => b.points - a.points);
  return { score, grade, deductions };
}

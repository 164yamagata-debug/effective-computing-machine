import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScore } from "../public/score.js";

const ing = (level, original = level) => ({ original, english: original, name: original, level });
const base = (ingredients, extra = {}) => ({ readable: true, ingredients, rule_hits: [], claims_check: "", ...extra });

test("clean product scores 100 / A", () => {
  assert.deepEqual(computeScore(base([ing("safe", "water"), ing("safe", "glycerin")])).score, 100);
  assert.equal(computeScore(base([ing("safe")])).grade, "A");
});

test("deductions add up", () => {
  const r = computeScore(base([ing("caution", "fragrance"), ing("low", "phenoxyethanol"), ing("safe", "water")]));
  assert.equal(r.score, 90);
  assert.deepEqual(r.deductions.map((d) => d.points), [8, 2]);
});

test("a single danger ingredient caps the score at 20", () => {
  assert.equal(computeScore(base([ing("danger", "mercury"), ing("safe")])).score, 20);
  assert.equal(computeScore(base([ing("warning", "melatonin")])).score, 50);
});

test("rule hits raise the matched ingredient's level without double counting", () => {
  const r = computeScore(base([ing("caution", "Melatonin")], { rule_hits: [{ matched: "Melatonin", level: "warning" }] }));
  assert.equal(r.score, 50);
  assert.equal(r.deductions.length, 1);
});

test("no ingredient list gives no score", () => {
  assert.equal(computeScore(base([])).score, null);
  assert.equal(computeScore({ readable: false, ingredients: [ing("safe")] }).score, null);
});

test("problematic claims cost 5 points", () => {
  assert.equal(computeScore(base([ing("safe")], { claims_problem: true, claims_check: "cures disease" })).score, 95);
});

test("a 'no problem found' comment on claims costs nothing", () => {
  assert.equal(computeScore(base([ing("safe")], { claims_problem: false, claims_check: "No problematic claims found." })).score, 100);
});

test("allergen ingredients do not lower the score", () => {
  const r = computeScore(base([ing("caution", "Whey protein"), ing("safe", "water")], { allergens: [{ name: "Milk", kind: "mandatory", source: "Whey protein" }] }));
  assert.equal(r.score, 100);
});

test("an allergen that is also a serious ingredient still counts", () => {
  const r = computeScore(base([ing("warning", "Shrimp extract")], { allergens: [{ name: "Shrimp", kind: "mandatory", source: "Shrimp extract" }] }));
  assert.equal(r.score, 50);
});

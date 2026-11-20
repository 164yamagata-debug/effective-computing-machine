import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRules } from "../lib/rules.js";

const ids = (list) => checkRules(list.map((original) => ({ original }))).map((h) => h.id);

test("flags Japan-restricted ingredients in several languages", () => {
  assert.deepEqual(ids(["Mercurous chloride"]), ["mercury"]);
  assert.deepEqual(ids(["褪黑素"]), ["melatonin"]);
  assert.deepEqual(ids(["Clobetasol propionate"]), ["steroid"]);
  assert.deepEqual(ids(["멜라토닌"]), ["melatonin"]);
  assert.deepEqual(ids(["Sibutramine"]), ["undeclared_drugs"]);
});

test("does not flag common safe ingredients", () => {
  assert.deepEqual(ids(["Aqua", "Glycerin", "Niacinamide", "Phenoxyethanol", "鉛筆"]), []);
});

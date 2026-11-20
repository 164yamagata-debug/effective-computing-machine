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

test("flags health-food interactions and red yeast rice", () => {
  assert.deepEqual(ids(["Red yeast rice extract"]), ["red_yeast_rice"]);
  assert.deepEqual(ids(["セイヨウオトギリソウエキス"]), ["st_johns_wort"]);
  assert.deepEqual(ids(["Ginkgo biloba leaf extract"]), ["ginkgo"]);
  assert.deepEqual(ids(["ビタミンK2"]), ["vitamin_k"]);
});

import { detectAllergens, mergeAllergens } from "../lib/rules.js";
const allergens = (list) => detectAllergens(list.map((original) => ({ original }))).map((a) => a.id);

test("detects Japan's mandatory allergens", () => {
  assert.deepEqual(allergens(["Whey protein"]), ["milk"]);
  assert.deepEqual(allergens(["小麦粉", "鶏卵", "落花生油"]), ["wheat", "egg", "peanut"]);
  assert.deepEqual(allergens(["Shrimp extract", "くるみ"]), ["shrimp", "walnut"]);
});

test("avoids common allergen false positives", () => {
  assert.deepEqual(allergens(["Coconut milk", "乳化剤", "乳酸", "Cocoa butter", "Shea butter", "Milk thistle", "そばかす", "豆乳"]), []);
});

test("merge keeps model allergens and adds missed mandatory ones", () => {
  const merged = mergeAllergens([{ name: "乳", kind: "mandatory", source: "乳清" }], [{ id: "milk", source: "乳清" }, { id: "egg", source: "卵黄" }], "ja");
  assert.deepEqual(merged.map((m) => m.name), ["乳", "卵"]);
});

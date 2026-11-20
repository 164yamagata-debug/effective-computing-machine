// Sample result returned when no API key is configured, so the UI can be tried out.
const JA = {
  readable: true,
  product: {
    name: "Whitening Night Cream（ホワイトニング ナイトクリーム）※サンプル",
    brand: "（サンプル）",
    category: "skincare",
    origin_country: "タイ（推定：バーコード885・住所表記より）",
    label_languages: ["英語", "タイ語"],
  },
  overall: {
    level: "warning",
    summary:
      "これはデモモード（DEMO_MODE=1）のサンプル結果です。ハイドロキノンを含む海外製の美白クリームの例で、日本でも使える成分ですが濃度が表示されておらず、刺激に注意が必要です。香料も含まれます。",
  },
  food_label: { type: "not_food", notification_number: "", explanation: "" },
  allergens: [],
  intake: [],
  interactions: [],
  ingredients: [
    { original: "Aqua", english: "Water", name: "水", purpose: "基剤", level: "safe", note: "" },
    { original: "Glycerin", english: "Glycerin", name: "グリセリン", purpose: "保湿", level: "safe", note: "" },
    { original: "Niacinamide", english: "Niacinamide", name: "ナイアシンアミド", purpose: "美白・肌荒れ防止", level: "safe", note: "" },
    { original: "Hydroquinone", english: "Hydroquinone", name: "ハイドロキノン", purpose: "美白", level: "caution", note: "濃度表示なし。高濃度だと刺激や白斑のリスク" },
    { original: "Phenoxyethanol", english: "Phenoxyethanol", name: "フェノキシエタノール", purpose: "防腐剤", level: "low", note: "日本の基準内なら一般的な防腐剤" },
    { original: "Parfum", english: "Fragrance", name: "香料", purpose: "香りづけ", level: "caution", note: "アレルギーの原因になることがある" },
  ],
  japan_notes: [
    { title: "個人輸入の目安", level: "low", detail: "化粧品は1品目24個までが個人使用の目安です。" },
  ],
  cautions: [
    { title: "妊娠中・授乳中", who: "妊娠中・授乳中の方", detail: "ハイドロキノン配合品は使用前に医師に相談してください。" },
    { title: "パッチテスト", who: "敏感肌の方", detail: "腕の内側で24時間試してから顔に使いましょう。" },
  ],
  claims_check: "「7日で真っ白」などの効果表現は、日本では広告として認められない可能性があります。",
  confidence: "medium",
  missing: "（サンプル）実際に解析するには DEMO_MODE を外して起動してください。",
};

const EN = {
  ...JA,
  product: { ...JA.product, name: "Whitening Night Cream (sample)", brand: "(sample)", origin_country: "Thailand (inferred from barcode 885 and address)", label_languages: ["English", "Thai"] },
  overall: {
    level: "warning",
    summary:
      "This is a sample result (DEMO_MODE=1). It is an imported whitening cream with hydroquinone; the concentration is not stated, so watch for irritation. It also contains fragrance.",
  },
  ingredients: JA.ingredients.map((i) => ({ ...i, name: i.english, purpose: "", note: i.level === "safe" ? "" : "See note" })),
  japan_notes: [{ title: "Personal import limit", level: "low", detail: "Cosmetics: up to 24 units per item for personal use." }],
  cautions: [{ title: "Pregnancy", who: "Pregnant or breastfeeding", detail: "Ask a doctor before using hydroquinone products." }],
  claims_check: "Claims like 'white in 7 days' would likely not be permitted in Japanese advertising.",
  missing: "(sample) Start without DEMO_MODE to analyse real photos.",
};

export function demoResult(lang) {
  return structuredClone(lang === "ja" ? JA : EN);
}

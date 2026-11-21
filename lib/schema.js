import { z } from "zod";

// Risk levels shared by the whole result. Order matters: later = more serious.
export const LEVELS = ["safe", "low", "caution", "warning", "danger", "unknown"];
const Level = z.enum(LEVELS);

export const AnalysisSchema = z.object({
  readable: z
    .boolean()
    .describe("false if the photos do not show a product label that can be analysed"),
  product: z.object({
    name: z.string().describe("Product name as printed (original language) plus a translation in the output language if different"),
    brand: z.string(),
    category: z.enum(["skincare", "cosmetics", "supplement", "health_food", "food", "medicine", "other", "unknown"]),
    origin_country: z.string().describe("Country of manufacture or sale, in the output language. 'unknown' equivalent if not shown"),
    label_languages: z.array(z.string()).describe("Languages printed on the label, in the output language"),
  }),
  supply: z
    .object({
      per_day: z.string().describe("Recommended daily amount as printed, e.g. '2 tablets', or empty"),
      days: z.number().describe("How many days one package lasts at the recommended amount (e.g. 60 tablets at 2/day = 30). 0 if unknown or not applicable"),
    })
    .describe("Package size in days, used to compare price per day"),
  overall: z.object({
    level: Level,
    summary: z.string().describe("2-4 sentence plain-language verdict in the output language"),
  }),
  food_label: z
    .object({
      type: z
        .enum(["tokuho", "kinousei", "eiyou_kinou", "general_health_food", "foreign_supplement", "not_food", "unknown"])
        .describe(
          "Japanese regulatory class of a food product: tokuho = 特定保健用食品 (FOSHU, government-approved, 'tokuho' mark); kinousei = 機能性表示食品 (notified to the Consumer Affairs Agency, has a notification number like A123/B123...); eiyou_kinou = 栄養機能食品 (nutrient function claims); general_health_food = いわゆる健康食品 sold in Japan with no approval or notification; foreign_supplement = supplement made for a foreign market; not_food = cosmetics/medicine/etc.; unknown"
        ),
      notification_number: z.string().describe("機能性表示食品 notification number or トクホ approval info if printed, else empty"),
      explanation: z.string().describe("What this class means for the consumer, 1-2 sentences, in the output language. Empty for not_food."),
    }),
  allergens: z
    .array(
      z.object({
        name: z.string().describe("Allergen in the output language"),
        kind: z.enum(["mandatory", "recommended", "other"]).describe(
          "mandatory = one of Japan's 8 特定原材料 (shrimp, crab, walnut, wheat, buckwheat, egg, milk, peanut); recommended = one of the 特定原材料に準ずるもの (e.g. soy, sesame, almond, cashew, salmon, gelatin, apple, banana...); other"
        ),
        source: z.string().describe("Ingredient on the label that contains it"),
      })
    )
    .describe("Food allergens found in the ingredients or allergen statement. Empty for non-food products unless clearly relevant."),
  intake: z
    .array(
      z.object({
        nutrient: z.string(),
        amount: z.string().describe("Amount per recommended daily serving as printed, with unit"),
        level: Level,
        detail: z.string().describe("Compare with Japanese Dietary Reference Intakes (日本人の食事摂取基準) upper limit / recommended amount where one exists; mention risk of combining with other supplements"),
      })
    )
    .describe("Vitamins, minerals and other nutrients where the daily amount matters (excess risk). Empty if not applicable."),
  interactions: z
    .array(
      z.object({
        substance: z.string().describe("Ingredient in this product"),
        with_what: z.string().describe("Medicine or condition it interacts with"),
        level: Level,
        detail: z.string(),
      })
    )
    .describe("Known interactions with medicines (e.g. warfarin, antidepressants, oral contraceptives, immunosuppressants, diabetes or blood-pressure drugs). Empty if none known."),
  ingredients: z
    .array(
      z.object({
        original: z.string().describe("Ingredient exactly as printed on the label"),
        english: z.string().describe("INCI or standard English name"),
        name: z.string().describe("Name in the output language"),
        purpose: z.string().describe("What it is for, short, in the output language"),
        level: Level,
        note: z.string().describe("Why it matters, or empty string"),
      })
    )
    .describe("Every ingredient that can be read, in label order"),
  japan_notes: z
    .array(
      z.object({
        title: z.string(),
        level: Level,
        detail: z.string(),
      })
    )
    .describe("Points that matter under Japanese rules: ingredients prohibited or treated as medicines in Japan, personal import limits, etc. Empty if none."),
  cautions: z
    .array(
      z.object({
        title: z.string(),
        who: z.string().describe("Who should be careful (e.g. pregnant, sensitive skin, people on blood thinners), or empty"),
        detail: z.string(),
      })
    )
    .describe("Allergens, interactions, pregnancy, overdose, etc."),
  claims_problem: z
    .boolean()
    .describe("true only if the package has at least one claim that is not allowed in Japan or is clearly misleading; false if no such claim was found"),
  claims_check: z
    .string()
    .describe("Comment on marketing claims that are not allowed in Japan: disease treatment/prevention claims for foods or cosmetics (e.g. 'cures cancer', 'lowers blood pressure' on a product that is not tokuho/kinousei), exaggerated effects, 'no side effects', etc. Empty string if none."),
  confidence: z.enum(["high", "medium", "low"]),
  missing: z
    .string()
    .describe("What could not be read or is missing, and which photo the user should add (e.g. 'please photograph the ingredient list on the back'). Empty if nothing."),
});

export const CompareSchema = z.object({
  summary: z.string().describe("3-5 sentence overview of how the products differ, in the output language"),
  best_for: z
    .array(
      z.object({
        situation: z.string().describe("A goal or type of person, e.g. 'people taking blood thinners', 'tired eyes', or the user's stated goal"),
        choice: z.string().describe("Product name, or 'none of these' equivalent"),
        reason: z.string(),
      })
    )
    .describe("Which product fits which situation. Put the user's stated goal first if given."),
  differences: z
    .array(z.object({ aspect: z.string(), detail: z.string() }))
    .describe("Key differences: main ingredients and amounts, label type/evidence, safety concerns, allergens, value for money if prices are given"),
  overlap: z.string().describe("Warning if taking several of these together would double up on the same ingredient, or empty"),
  cautions: z.array(z.string()).describe("Important cautions, e.g. ask a pharmacist when on medication"),
});

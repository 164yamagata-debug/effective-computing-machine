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
    category: z.enum(["skincare", "cosmetics", "supplement", "food", "medicine", "other", "unknown"]),
    origin_country: z.string().describe("Country of manufacture or sale, in the output language. 'unknown' equivalent if not shown"),
    label_languages: z.array(z.string()).describe("Languages printed on the label, in the output language"),
  }),
  overall: z.object({
    level: Level,
    summary: z.string().describe("2-4 sentence plain-language verdict in the output language"),
  }),
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
  claims_check: z
    .string()
    .describe("Comment on suspicious marketing claims on the package (e.g. 'cures', 'instant whitening'), or empty string"),
  confidence: z.enum(["high", "medium", "low"]),
  missing: z
    .string()
    .describe("What could not be read or is missing, and which photo the user should add (e.g. 'please photograph the ingredient list on the back'). Empty if nothing."),
});

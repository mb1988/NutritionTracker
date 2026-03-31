import OpenAI from "openai";
import { aiLogResponseSchema, type AiLogResponse } from "@/server/contracts/aiLog";
import { AppError } from "@/server/errors";

const SYSTEM_PROMPT = `You are a professional nutritionist AI. The user will describe a meal or food item (possibly with quantities in grams, ml, cups, pieces, etc.).

Return a single JSON object with EXACTLY these fields — no extra keys, no markdown, no explanation:

{
  "name":         "Short descriptive meal name (e.g. 'Grilled Chicken Breast with Rice')",
  "category":     One of "Breakfast", "Lunch", "Dinner", "Snack", "Other", or null if unclear,
  "calories":     number (kcal),
  "protein":      number (grams),
  "carbs":        number (grams, total carbohydrates),
  "fat":          number (grams, total fat),
  "satFat":       number (grams, saturated fat),
  "fibre":        number (grams, dietary fibre),
  "addedSugar":   number (grams, added/refined sugars only — not natural sugars from fruit/dairy),
  "naturalSugar": number (grams, naturally occurring sugars from fruit, dairy, vegetables),
  "salt":         number (grams, total salt — not sodium; salt ≈ sodium × 2.5),
  "alcohol":      number (UK alcohol units; 1 unit = 10 ml / 8 g pure alcohol),
  "omega3":       number (milligrams, combined EPA + DHA + ALA)
}

Rules:
- Use the USDA / NHS nutrition databases as your reference.
- If the user specifies a quantity, calculate values for that exact quantity.
- If no quantity is given, estimate for one typical adult serving.
- Round all numbers to 1 decimal place.
- If a nutrient is unknown or negligible, return 0.
- Do NOT wrap the JSON in markdown code fences — return raw JSON only.`;

/**
 * Calls OpenAI gpt-4o-mini to estimate nutrition from a natural-language
 * food description. Returns a Zod-validated object matching MealFormValues.
 */
export async function estimateNutrition(description: string): Promise<AiLogResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError("OPENAI_API_KEY is not configured — add it in your .env file", 503);
  }

  const openai = new OpenAI({ apiKey });

  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: description },
      ],
    });
  } catch (err) {
    // Surface the real OpenAI error (billing, auth, rate-limit, etc.)
    if (err instanceof OpenAI.APIError) {
      const msg = err.status === 401
        ? "Invalid OpenAI API key — check your OPENAI_API_KEY"
        : err.status === 429
        ? "OpenAI rate limit or billing issue — add a payment method at platform.openai.com/settings/organization/billing"
        : `OpenAI error: ${err.message}`;
      throw new AppError(msg, err.status ?? 502);
    }
    throw err;
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new AppError("Empty response from AI model", 502);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError("AI returned invalid JSON", 502);
  }

  // Validate + coerce with Zod — throws ZodError on mismatch
  const validated = aiLogResponseSchema.parse(parsed);

  // Round every numeric field to 1 decimal place for consistency
  return {
    ...validated,
    calories:     round1(validated.calories),
    protein:      round1(validated.protein),
    carbs:        round1(validated.carbs),
    fat:          round1(validated.fat),
    satFat:       round1(validated.satFat),
    fibre:        round1(validated.fibre),
    addedSugar:   round1(validated.addedSugar),
    naturalSugar: round1(validated.naturalSugar),
    salt:         round1(validated.salt),
    alcohol:      round1(validated.alcohol),
    omega3:       round1(validated.omega3),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}


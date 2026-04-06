import OpenAI from "openai";
import { aiLogResponseSchema, type AiLogRequest, type AiLogResponse, type AiModelTier } from "@/server/contracts/aiLog";
import { AppError } from "@/server/errors";

type NutrientNumberKey = Exclude<keyof AiLogResponse, "name" | "category">;
type LockedNutritionValues = Partial<AiLogResponse>;

type ParsedAmount = {
  value: number;
  unit: "g" | "ml";
};

type OpenFoodFactsProduct = {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  quantity?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: Record<string, number | string | undefined>;
};

type OpenFoodFactsSearchResponse = {
  products?: OpenFoodFactsProduct[];
};

type OpenFoodFactsProductResponse = {
  status?: number;
  product?: OpenFoodFactsProduct;
};

type OpenFoodFactsMatch = {
  values: LockedNutritionValues;
  totalSugar: number;
};

const OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const OFF_FIELDS = [
  "product_name",
  "product_name_en",
  "brands",
  "quantity",
  "serving_size",
  "serving_quantity",
  "nutriments",
].join(",");

const NUMBER_FIELDS: NutrientNumberKey[] = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "satFat",
  "fibre",
  "addedSugar",
  "naturalSugar",
  "salt",
  "alcohol",
  "omega3",
];

const SYSTEM_PROMPT = `You are a professional nutritionist AI. The user will describe a meal or food item (possibly with quantities in grams, ml, cups, pieces, etc.).

Return a single JSON object with EXACTLY these fields — no extra keys, no markdown, no explanation:

{
  "name":         "Short descriptive meal name (e.g. 'Grilled Chicken Breast with Rice')",
  "category":     Always return null — the user will assign the category themselves,
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
- If authoritative database values are supplied, copy them exactly for those fields.
- Round all numbers to 1 decimal place.
- If a nutrient is unknown or negligible, return 0.
- Do NOT wrap the JSON in markdown code fences; return raw JSON only.`;

/**
 * Hybrid nutrition estimation:
 * 1) Try Open Food Facts for likely packaged foods.
 * 2) Use OpenAI to complete missing fields (or fully estimate when OFF has no safe hit).
 * 3) If OpenAI is unavailable but OFF gave a confident result, return the OFF-based fallback.
 */
export async function estimateNutrition(inputOrDescription: AiLogRequest | string): Promise<AiLogResponse> {
  const input: AiLogRequest = typeof inputOrDescription === "string"
    ? { mode: "describe", description: inputOrDescription, modelTier: "accurate" }
    : inputOrDescription;

  switch (input.mode) {
    case "barcode": {
      const { match, usedAmount } = await lookupProductByBarcode(input.barcode, input.amount);
      return { ...finalizeNutrition(buildOpenFoodFactsFallback(input.barcode, match)), servingGrams: usedAmount };
    }
    case "productSearch": {
      const cleanedQuery = buildSearchQuery(input.query) || input.query.trim();
      const offMatch = await lookupProductBySearch(input.query, cleanedQuery, input.amount);
      if (!offMatch) {
        throw new AppError("No packaged-food match found. Try a barcode or describe the meal instead.", 404);
      }
      return finalizeNutrition(buildOpenFoodFactsFallback(input.query, offMatch));
    }
    case "describe": {
      const trimmed = input.description.trim();
      const offMatch = await tryEstimateFromOpenFoodFacts(trimmed).catch(() => null);

      try {
        if (offMatch) {
          return await completeNutritionWithAi(trimmed, input.modelTier, offMatch.values);
        }

        return await completeNutritionWithAi(trimmed, input.modelTier);
      } catch (error) {
        if (offMatch && isRecoverableAiError(error)) {
          return finalizeNutrition(buildOpenFoodFactsFallback(trimmed, offMatch));
        }

        throw error;
      }
    }
  }
}

async function completeNutritionWithAi(
  description: string,
  modelTier: AiModelTier,
  lockedValues: LockedNutritionValues = {},
): Promise<AiLogResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError("OPENAI_API_KEY is not configured — add it in your .env file", 503);
  }

  const openai = new OpenAI({ apiKey });

  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await openai.chat.completions.create({
      model: resolveOpenAiModel(modelTier),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            description,
            authoritativeValues: lockedValues,
            instruction: Object.keys(lockedValues).length
              ? "Use authoritativeValues exactly for the fields provided. Infer only missing fields and a user-friendly meal name."
              : "Estimate the complete nutrition profile.",
          }),
        },
      ],
    });
  } catch (err) {
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

  const validated = aiLogResponseSchema.parse(parsed);
  const merged = mergeLockedValues({ ...validated, category: null }, lockedValues);
  return finalizeNutrition(merged);
}

async function tryEstimateFromOpenFoodFacts(description: string): Promise<OpenFoodFactsMatch | null> {
  if (!looksLikeSinglePackagedFood(description)) {
    return null;
  }

  const parsedAmount = extractAmount(description);
  const query = buildSearchQuery(description);
  if (!query) {
    return null;
  }

  return lookupProductBySearch(description, query, parsedAmount?.value, false);
}

async function lookupProductBySearch(
  description: string,
  query: string,
  amount?: number,
  throwWhenMissing = true,
): Promise<OpenFoodFactsMatch | null> {
  const url = new URL(OPEN_FOOD_FACTS_URL);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "8");
  url.searchParams.set("fields", OFF_FIELDS);

  const data = await fetchOpenFoodFactsJson<OpenFoodFactsSearchResponse>(url.toString());
  const products = data.products ?? [];
  if (!products.length) {
    if (throwWhenMissing) {
      throw new AppError("No packaged-food match found. Try a barcode or describe the meal instead.", 404);
    }
    return null;
  }

  const best = rankBestProductMatch(products, description, query);
  if (!best || !isConfidentProductMatch(best)) {
    if (throwWhenMissing) {
      throw new AppError("Could not find a confident packaged-food match. Try a barcode or describe the meal instead.", 404);
    }
    return null;
  }

  const usedAmount = typeof amount === "number" && amount > 0
    ? amount
    : determineUsedAmount(best.product, null);
  const nutrition = mapProductToNutrition(best.product, usedAmount);
  if (!nutrition) {
    if (throwWhenMissing) {
      throw new AppError("Matched product is missing core nutrition values. Try another product or describe the meal.", 404);
    }
    return null;
  }

  return nutrition;
}

async function lookupProductByBarcode(barcode: string, amount?: number): Promise<{ match: OpenFoodFactsMatch; usedAmount: number }> {
  const sanitized = barcode.replace(/\D/g, "");
  const url = `https://world.openfoodfacts.org/api/v2/product/${sanitized}.json?fields=${encodeURIComponent(OFF_FIELDS)}`;
  const data = await fetchOpenFoodFactsJson<OpenFoodFactsProductResponse>(url);
  const product = data.product;

  if (!product || data.status === 0) {
    throw new AppError("No product found for that barcode. Try another barcode or search by name.", 404);
  }

  const usedAmount = typeof amount === "number" && amount > 0
    ? amount
    : determineUsedAmount(product, null);
  const nutrition = mapProductToNutrition(product, usedAmount);

  if (!nutrition) {
    throw new AppError("That barcode was found, but its nutrition data is incomplete. Try another product or describe the meal.", 404);
  }

  return { match: nutrition, usedAmount };
}

async function fetchOpenFoodFactsJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "NutritionTracker/0.1 (+https://nutritiontracker-production.up.railway.app)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AppError(`Open Food Facts lookup failed (${response.status})`, 502);
  }

  return await response.json() as T;
}

function rankBestProductMatch(products: OpenFoodFactsProduct[], description: string, query: string) {
  const normalizedQuery = normalizeText(query);
  const queryTokens = tokenise(query);
  const exactNormalizedDescription = normalizeText(description);

  let best: { product: OpenFoodFactsProduct; score: number; tokenCoverage: number; hasCoreNutrition: boolean } | null = null;

  for (const product of products) {
    const label = getProductDisplayName(product);
    if (!label) continue;

    const haystack = normalizeText(`${label} ${product.brands ?? ""}`);
    const tokensMatched = queryTokens.filter((token) => haystack.includes(token)).length;
    const tokenCoverage = queryTokens.length ? tokensMatched / queryTokens.length : 0;
    const exactBoost = haystack.includes(normalizedQuery) || haystack.includes(exactNormalizedDescription) ? 0.2 : 0;
    const productHasCoreNutrition = hasCoreNutrition(product);
    const nutrientBoost = productHasCoreNutrition ? 0.15 : 0;
    const brandBoost = product.brands && normalizeText(description).includes(normalizeText(product.brands)) ? 0.1 : 0;
    const score = tokenCoverage + exactBoost + nutrientBoost + brandBoost;

    if (!best || score > best.score) {
      best = { product, score, tokenCoverage, hasCoreNutrition: productHasCoreNutrition };
    }
  }

  return best;
}

function isConfidentProductMatch(match: { score: number; tokenCoverage: number; hasCoreNutrition: boolean }): boolean {
  if (match.score >= 0.58) {
    return true;
  }

  return match.hasCoreNutrition && match.tokenCoverage >= 0.5 && match.score >= 0.45;
}

function mapProductToNutrition(product: OpenFoodFactsProduct, amount: number) {
  const calories = readScaledNutrient(product, amount, "energy-kcal");
  const protein = readScaledNutrient(product, amount, "proteins");
  const carbs = readScaledNutrient(product, amount, "carbohydrates");
  const fat = readScaledNutrient(product, amount, "fat");

  if (calories == null || protein == null || carbs == null || fat == null) {
    return null;
  }

  const saturatedFat = readScaledNutrient(product, amount, "saturated-fat") ?? 0;
  const fibre = readScaledNutrient(product, amount, "fiber") ?? 0;
  const salt = readScaledNutrient(product, amount, "salt") ?? 0;
  const alcoholGrams = readScaledNutrient(product, amount, "alcohol") ?? 0;
  const omega3Grams = readScaledNutrient(product, amount, "omega-3-fat") ?? 0;
  const sugars = readScaledNutrient(product, amount, "sugars") ?? 0;

  return {
    values: {
      name: getProductDisplayName(product),
      calories,
      protein,
      carbs,
      fat,
      satFat: saturatedFat,
      fibre,
      salt,
      alcohol: alcoholGrams / 8,
      omega3: omega3Grams * 1000,
    } satisfies LockedNutritionValues,
    totalSugar: sugars,
  };
}

function buildOpenFoodFactsFallback(description: string, match: OpenFoodFactsMatch): AiLogResponse {
  const likelyNaturalSugar = looksLikeNaturalSugarSource(`${description} ${match.values.name ?? ""}`);

  return {
    name: typeof match.values.name === "string" && match.values.name.trim()
      ? match.values.name
      : buildFallbackName(description),
    category: null,
    calories: match.values.calories ?? 0,
    protein: match.values.protein ?? 0,
    carbs: match.values.carbs ?? 0,
    fat: match.values.fat ?? 0,
    satFat: match.values.satFat ?? 0,
    fibre: match.values.fibre ?? 0,
    addedSugar: likelyNaturalSugar ? 0 : match.totalSugar,
    naturalSugar: likelyNaturalSugar ? match.totalSugar : 0,
    salt: match.values.salt ?? 0,
    alcohol: match.values.alcohol ?? 0,
    omega3: match.values.omega3 ?? 0,
  };
}

function mergeLockedValues(result: AiLogResponse, lockedValues: LockedNutritionValues): AiLogResponse {
  const merged: AiLogResponse = { ...result };

  if (typeof lockedValues.name === "string" && lockedValues.name.trim()) {
    merged.name = lockedValues.name;
  }

  if (lockedValues.category) {
    merged.category = lockedValues.category;
  }

  for (const field of NUMBER_FIELDS) {
    const value = lockedValues[field];
    if (typeof value === "number") {
      merged[field] = value;
    }
  }

  return merged;
}

function finalizeNutrition(data: AiLogResponse): AiLogResponse {
  return {
    ...data,
    calories: round1(data.calories),
    protein: round1(data.protein),
    carbs: round1(data.carbs),
    fat: round1(data.fat),
    satFat: round1(data.satFat),
    fibre: round1(data.fibre),
    addedSugar: round1(data.addedSugar),
    naturalSugar: round1(data.naturalSugar),
    salt: round1(data.salt),
    alcohol: round1(data.alcohol),
    omega3: round1(data.omega3),
  };
}

function hasCoreNutrition(product: OpenFoodFactsProduct): boolean {
  return ["energy-kcal", "proteins", "carbohydrates", "fat"].every((key) => readScaledNutrient(product, 100, key) != null);
}

function readScaledNutrient(product: OpenFoodFactsProduct, amount: number, nutrientKey: string): number | null {
  const nutriments = product.nutriments;
  if (!nutriments) return null;

  if (nutrientKey === "energy-kcal") {
    const energyKcal = readEnergyKcal(nutriments, amount);
    if (energyKcal != null) {
      return energyKcal;
    }
  }

  const per100 = toFiniteNumber(nutriments[`${nutrientKey}_100g`]);
  if (per100 != null) {
    return (per100 * amount) / 100;
  }

  const servingValue = toFiniteNumber(nutriments[`${nutrientKey}_serving`]);
  const servingQuantity = determineServingQuantity(product);
  if (servingValue != null) {
    if (servingQuantity && amount !== servingQuantity) {
      return (servingValue * amount) / servingQuantity;
    }
    return servingValue;
  }

  return null;
}

function readEnergyKcal(nutriments: Record<string, number | string | undefined>, amount: number): number | null {
  const kcalPer100 = toFiniteNumber(nutriments["energy-kcal_100g"]);
  if (kcalPer100 != null) {
    return (kcalPer100 * amount) / 100;
  }

  const kcalPerServing = toFiniteNumber(nutriments["energy-kcal_serving"]);
  if (kcalPerServing != null) {
    return kcalPerServing;
  }

  const kjPer100 = toFiniteNumber(nutriments["energy_100g"]);
  if (kjPer100 != null) {
    return (kjPer100 / 4.184) * (amount / 100);
  }

  const kjPerServing = toFiniteNumber(nutriments["energy_serving"]);
  if (kjPerServing != null) {
    return kjPerServing / 4.184;
  }

  return null;
}

function determineUsedAmount(product: OpenFoodFactsProduct, parsedAmount: ParsedAmount | null): number {
  if (parsedAmount) {
    return parsedAmount.value;
  }

  const servingQuantity = determineServingQuantity(product);
  if (servingQuantity) {
    return servingQuantity;
  }

  return 100;
}

function determineServingQuantity(product: OpenFoodFactsProduct): number | null {
  const servingQuantity = toFiniteNumber(product.serving_quantity);
  if (servingQuantity != null && servingQuantity > 0) {
    return servingQuantity;
  }

  return extractNumericMass(product.serving_size ?? product.quantity ?? null);
}

function extractAmount(description: string): ParsedAmount | null {
  const match = description.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\b/i);
  if (!match) {
    return null;
  }

  const raw = Number(match[1].replace(",", "."));
  if (!Number.isFinite(raw) || raw <= 0) {
    return null;
  }

  const unit = match[2].toLowerCase();
  if (unit === "kg") {
    return { value: raw * 1000, unit: "g" };
  }
  if (unit === "l") {
    return { value: raw * 1000, unit: "ml" };
  }

  return { value: raw, unit: unit as "g" | "ml" };
}

function extractNumericMass(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const match = value.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\b/i);
  if (!match) {
    return null;
  }

  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const unit = match[2].toLowerCase();
  if (unit === "kg" || unit === "l") {
    return amount * 1000;
  }
  return amount;
}

function buildSearchQuery(description: string): string {
  return description
    .toLowerCase()
    .replace(/\b\d+(?:[.,]\d+)?\s*(kg|g|l|ml)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
    .slice(0, 8)
    .join(" ")
    .trim();
}

function looksLikeSinglePackagedFood(description: string): boolean {
  const lowered = description.toLowerCase();
  const separators = [" with ", ",", " + ", " & "];
  if (separators.some((separator) => lowered.includes(separator))) {
    return false;
  }

  const amountMatches = lowered.match(/\d+(?:[.,]\d+)?\s*(kg|g|l|ml)\b/g);
  if ((amountMatches?.length ?? 0) > 1) {
    return false;
  }

  return true;
}

function getProductDisplayName(product: OpenFoodFactsProduct): string {
  return product.product_name?.trim() || product.product_name_en?.trim() || "";
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenise(value: string): string[] {
  return normalizeText(value).split(" ").filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function toFiniteNumber(value: unknown): number | null {
  const num = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(num) ? num : null;
}

function looksLikeNaturalSugarSource(value: string): boolean {
  return /(fruit|banana|berry|berries|apple|orange|mango|grape|juice|smoothie|milk|yogurt|yoghurt|kefir)/i.test(value);
}

function buildFallbackName(description: string): string {
  const cleaned = description.trim().replace(/\s+/g, " ");
  if (!cleaned) return "Food item";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function resolveOpenAiModel(modelTier: AiModelTier): string {
  const envModel = process.env.OPENAI_MODEL?.trim();
  if (envModel) {
    return envModel;
  }

  return modelTier === "accurate" ? "gpt-4o" : "gpt-4o-mini";
}

function isRecoverableAiError(error: unknown): boolean {
  return error instanceof AppError && error.status >= 401 && error.status < 600;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "my",
  "for",
  "of",
  "to",
  "in",
  "on",
  "at",
  "pack",
  "bottle",
  "tin",
  "can",
  "grams",
  "gram",
  "ml",
  "g",
]);


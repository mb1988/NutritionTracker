import OpenAI from "openai";
import {
  foodSuggestionResponseSchema,
  type FoodSuggestion,
  type FoodSuggestionRequest,
  type FoodSuggestionResponse,
} from "@/server/contracts/foodSuggestions";

const CAP_KEYS = ["calories", "carbs", "fat", "satFat", "addedSugar", "naturalSugar", "salt", "alcohol"] as const;
const DEFICIT_KEYS = ["protein", "fibre", "omega3"] as const;

type GoalKey = keyof FoodSuggestionRequest["goals"];
type IdeaCandidate = FoodSuggestion & { score: number };

type CatalogIdea = Omit<FoodSuggestion, "source" | "reason"> & {
  tags: string[];
};

const HEALTHY_IDEA_CATALOG: CatalogIdea[] = [
  {
    name: "Skyr with berries",
    category: "Snack",
    calories: 160,
    protein: 18,
    carbs: 16,
    fat: 1,
    satFat: 0.2,
    fibre: 4,
    addedSugar: 0,
    naturalSugar: 12,
    salt: 0.2,
    alcohol: 0,
    omega3: 120,
    tags: ["high-protein", "light", "fibre"],
  },
  {
    name: "Edamame snack pot",
    category: "Snack",
    calories: 190,
    protein: 17,
    carbs: 13,
    fat: 8,
    satFat: 1.2,
    fibre: 8,
    addedSugar: 0,
    naturalSugar: 2,
    salt: 0.25,
    alcohol: 0,
    omega3: 300,
    tags: ["high-protein", "fibre", "omega3"],
  },
  {
    name: "Cottage cheese with cucumber",
    category: "Snack",
    calories: 150,
    protein: 20,
    carbs: 6,
    fat: 4,
    satFat: 2.1,
    fibre: 1.5,
    addedSugar: 0,
    naturalSugar: 5,
    salt: 0.45,
    alcohol: 0,
    omega3: 60,
    tags: ["high-protein", "light"],
  },
  {
    name: "Tuna and cucumber bowl",
    category: "Lunch",
    calories: 220,
    protein: 26,
    carbs: 7,
    fat: 9,
    satFat: 1.5,
    fibre: 2,
    addedSugar: 0,
    naturalSugar: 4,
    salt: 0.55,
    alcohol: 0,
    omega3: 420,
    tags: ["high-protein", "omega3"],
  },
  {
    name: "Chia overnight oats pot",
    category: "Breakfast",
    calories: 240,
    protein: 14,
    carbs: 28,
    fat: 8,
    satFat: 1.1,
    fibre: 9,
    addedSugar: 0,
    naturalSugar: 7,
    salt: 0.12,
    alcohol: 0,
    omega3: 1800,
    tags: ["fibre", "omega3"],
  },
  {
    name: "Boiled eggs and carrot sticks",
    category: "Snack",
    calories: 170,
    protein: 13,
    carbs: 8,
    fat: 10,
    satFat: 2.8,
    fibre: 3,
    addedSugar: 0,
    naturalSugar: 4,
    salt: 0.35,
    alcohol: 0,
    omega3: 180,
    tags: ["protein", "light"],
  },
  {
    name: "Smoked salmon rice cakes",
    category: "Snack",
    calories: 210,
    protein: 15,
    carbs: 18,
    fat: 8,
    satFat: 1.4,
    fibre: 1.5,
    addedSugar: 0,
    naturalSugar: 2,
    salt: 0.7,
    alcohol: 0,
    omega3: 950,
    tags: ["omega3", "protein"],
  },
  {
    name: "Protein yoghurt with chia",
    category: "Snack",
    calories: 185,
    protein: 19,
    carbs: 12,
    fat: 4,
    satFat: 1.2,
    fibre: 5,
    addedSugar: 0,
    naturalSugar: 9,
    salt: 0.18,
    alcohol: 0,
    omega3: 950,
    tags: ["protein", "fibre", "omega3"],
  },
];

const AI_SYSTEM_PROMPT = `You are an expert nutrition assistant.

Return STRICT JSON only. No markdown. No commentary.

You must return an object with this exact shape:
{
  "suggestions": [
    {
      "name": "...",
      "category": "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Other" | null,
      "source": "logged" | "template" | "new",
      "reason": "short helpful explanation",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "satFat": number,
      "fibre": number,
      "addedSugar": number,
      "naturalSugar": number,
      "salt": number,
      "alcohol": number,
      "omega3": number
    }
  ]
}

Rules:
- Return 3 to 5 suggestions.
- Prefer ideas based on the user's logged meals and saved templates when they fit.
- Include at least 1 genuinely new idea with source = "new".
- Keep calories, carbs, fat, satFat, addedSugar, naturalSugar, salt, and alcohol within the user's remaining room when possible.
- Protein, fibre, and omega3 are good nutrients to top up.
- Smaller portions are allowed when needed to fit today's remaining room.
- Reasons must be short and practical.
- Round all numbers to 1 decimal place.
- Never exceed obvious remaining limits unless the user is already over target; in that case suggest only light, damage-limiting options.`;

export async function generateFoodSuggestions(input: FoodSuggestionRequest): Promise<FoodSuggestionResponse> {
  const fallback = buildFallbackSuggestions(input);
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return { suggestions: fallback };
  }

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: resolveSuggestionModel(),
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            date: input.date,
            goals: input.goals,
            totals: input.totals,
            remaining: computeRemaining(input),
            loggedMeals: input.meals.slice(0, 8),
            savedTemplates: input.savedMeals.slice(0, 10),
            healthyIdeaCatalog: HEALTHY_IDEA_CATALOG.map(({ tags: _tags, ...idea }) => idea),
            guidance: buildGoalGuidance(input),
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return { suggestions: fallback };
    }

    const parsed = JSON.parse(raw);
    const validated = foodSuggestionResponseSchema.parse(parsed);
    const merged = mergeWithFallback(validated.suggestions, fallback, input);
    return { suggestions: merged };
  } catch {
    return { suggestions: fallback };
  }
}

function buildFallbackSuggestions(input: FoodSuggestionRequest): FoodSuggestion[] {
  const remaining = computeRemaining(input);
  const candidates: IdeaCandidate[] = [];

  for (const meal of dedupeByName(input.meals)) {
    const adjusted = adaptCandidateToRemaining(meal, "logged", remaining);
    if (adjusted) {
      candidates.push(scoreCandidate(adjusted, input, 0.8));
    }
  }

  for (const template of dedupeByName(input.savedMeals)) {
    const adjusted = adaptCandidateToRemaining(template, "template", remaining);
    if (adjusted) {
      candidates.push(scoreCandidate(adjusted, input, 1));
    }
  }

  for (const idea of HEALTHY_IDEA_CATALOG) {
    const adjusted = adaptCandidateToRemaining(idea, "new", remaining);
    if (adjusted) {
      candidates.push(scoreCandidate(adjusted, input, 0.72));
    }
  }

  const selected: FoodSuggestion[] = [];
  const used = new Set<string>();

  const bestNew = candidates
    .filter((candidate) => candidate.source === "new")
    .sort((a, b) => b.score - a.score)[0];
  if (bestNew) {
    selected.push(stripScore(bestNew));
    used.add(normalizeName(bestNew.name));
  }

  for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
    const key = normalizeName(candidate.name);
    if (used.has(key)) continue;
    selected.push(stripScore(candidate));
    used.add(key);
    if (selected.length === 4) break;
  }

  if (selected.length < 3) {
    for (const candidate of buildEmergencySuggestions(input)) {
      const key = normalizeName(candidate.name);
      if (used.has(key)) continue;
      selected.push(candidate);
      used.add(key);
      if (selected.length === 3) break;
    }
  }

  const normalized = selected
    .map((suggestion) => normalizeSuggestion(suggestion))
    .slice(0, 5);

  return ensureNewSuggestion(normalized, input).slice(0, Math.max(3, Math.min(5, normalized.length || 3)));
}

function buildEmergencySuggestions(input: FoodSuggestionRequest): FoodSuggestion[] {
  const alreadyOverCalories = input.totals.calories >= input.goals.calories;
  const base = alreadyOverCalories
    ? [
        {
          name: "Cucumber and cottage cheese pot",
          category: "Snack" as const,
          calories: 95,
          protein: 12,
          carbs: 4,
          fat: 3,
          satFat: 1.2,
          fibre: 1,
          addedSugar: 0,
          naturalSugar: 3,
          salt: 0.22,
          alcohol: 0,
          omega3: 40,
          source: "new" as const,
          reason: "Very light option to add protein without pushing calories much higher.",
        },
        {
          name: "Berry skyr mini pot",
          category: "Snack" as const,
          calories: 120,
          protein: 14,
          carbs: 10,
          fat: 0.4,
          satFat: 0.1,
          fibre: 2,
          addedSugar: 0,
          naturalSugar: 8,
          salt: 0.12,
          alcohol: 0,
          omega3: 70,
          source: "new" as const,
          reason: "Keeps things light while topping up protein.",
        },
        {
          name: "Tuna cucumber cups",
          category: "Snack" as const,
          calories: 110,
          protein: 16,
          carbs: 2,
          fat: 4,
          satFat: 0.6,
          fibre: 0.8,
          addedSugar: 0,
          naturalSugar: 1.5,
          salt: 0.3,
          alcohol: 0,
          omega3: 240,
          source: "new" as const,
          reason: "Adds protein and omega-3 with very little sugar.",
        },
      ]
    : [
        {
          name: "Greek yoghurt and berries",
          category: "Snack" as const,
          calories: 155,
          protein: 17,
          carbs: 13,
          fat: 2,
          satFat: 0.7,
          fibre: 3,
          addedSugar: 0,
          naturalSugar: 11,
          salt: 0.14,
          alcohol: 0,
          omega3: 80,
          source: "new" as const,
          reason: "Simple protein top-up that stays light on fat and salt.",
        },
        {
          name: "Edamame bowl",
          category: "Snack" as const,
          calories: 180,
          protein: 16,
          carbs: 12,
          fat: 7,
          satFat: 1,
          fibre: 8,
          addedSugar: 0,
          naturalSugar: 2,
          salt: 0.2,
          alcohol: 0,
          omega3: 260,
          source: "new" as const,
          reason: "Helps fill protein and fibre without heavy sugar.",
        },
        {
          name: "Salmon rice cakes",
          category: "Snack" as const,
          calories: 205,
          protein: 15,
          carbs: 16,
          fat: 8,
          satFat: 1.3,
          fibre: 1.2,
          addedSugar: 0,
          naturalSugar: 1,
          salt: 0.55,
          alcohol: 0,
          omega3: 880,
          source: "new" as const,
          reason: "Good if you still want a meaningful omega-3 boost.",
        },
      ];

  return base.filter((item) => fitsTargets(item, input));
}

function mergeWithFallback(
  aiSuggestions: FoodSuggestion[],
  fallback: FoodSuggestion[],
  input: FoodSuggestionRequest,
): FoodSuggestion[] {
  const accepted: FoodSuggestion[] = [];
  const used = new Set<string>();

  for (const suggestion of aiSuggestions.map(normalizeSuggestion)) {
    const key = normalizeName(suggestion.name);
    if (used.has(key) || !fitsTargets(suggestion, input)) continue;
    accepted.push(suggestion);
    used.add(key);
    if (accepted.length === 5) break;
  }

  for (const suggestion of fallback) {
    const key = normalizeName(suggestion.name);
    if (used.has(key)) continue;
    accepted.push(suggestion);
    used.add(key);
    if (accepted.length >= 4) break;
  }

  const toppedUp = ensureNewSuggestion(accepted.slice(0, 5), input);
  return toppedUp.length >= 3 ? toppedUp.slice(0, 5) : fallback.slice(0, 3);
}

function ensureNewSuggestion(suggestions: FoodSuggestion[], input: FoodSuggestionRequest): FoodSuggestion[] {
  if (suggestions.some((suggestion) => suggestion.source === "new")) {
    return suggestions;
  }

  const replacement = buildFallbackSuggestions({ ...input, meals: [], savedMeals: [] }).find((item) => item.source === "new");
  if (!replacement) {
    return suggestions;
  }

  if (suggestions.length >= 5) {
    return [replacement, ...suggestions.slice(0, 4)];
  }

  return [replacement, ...suggestions].slice(0, 5);
}

function adaptCandidateToRemaining(
  base: Omit<FoodSuggestion, "source" | "reason">,
  source: FoodSuggestion["source"],
  remaining: Record<GoalKey, number>,
): FoodSuggestion | null {
  const scale = calculateScale(base, remaining);
  if (scale <= 0.28) {
    return null;
  }

  const scaled = scaleSuggestion(base, scale);
  return {
    ...scaled,
    source,
    reason: buildReason(scaled, source, remaining),
  };
}

function calculateScale(
  item: Pick<FoodSuggestion, GoalKey | "name" | "category">,
  remaining: Record<GoalKey, number>,
): number {
  const ratios = CAP_KEYS
    .map((key) => {
      const value = item[key];
      const room = remaining[key];
      if (value <= 0) return Number.POSITIVE_INFINITY;
      if (room <= 0) {
        const gentleLimit = getGentleLimit(key);
        return gentleLimit / value;
      }
      return room / value;
    })
    .filter((value) => Number.isFinite(value) && value > 0);

  const limitingRatio = ratios.length ? Math.min(...ratios) : 1;
  return Math.min(1, limitingRatio);
}

function getGentleLimit(key: typeof CAP_KEYS[number]): number {
  switch (key) {
    case "calories":
      return 140;
    case "carbs":
      return 16;
    case "fat":
      return 7;
    case "satFat":
      return 2;
    case "addedSugar":
      return 2;
    case "naturalSugar":
      return 8;
    case "salt":
      return 0.4;
    case "alcohol":
      return 0;
  }
}

function buildReason(
  item: Pick<FoodSuggestion, GoalKey | "name">,
  source: FoodSuggestion["source"],
  remaining: Record<GoalKey, number>,
): string {
  const topBenefits = DEFICIT_KEYS
    .filter((key) => remaining[key] > 0 && item[key] > 0)
    .sort((a, b) => (item[b] / Math.max(remaining[b], 1)) - (item[a] / Math.max(remaining[a], 1)))
    .slice(0, 2)
    .map(formatBenefitLabel);

  const benefitText = topBenefits.length ? `tops up ${topBenefits.join(" and ")}` : "fits your remaining targets";

  if (source === "template") {
    return `Saved template that ${benefitText} without pushing the main caps too hard.`;
  }
  if (source === "logged") {
    return `A smaller repeat of something you already ate that still ${benefitText}.`;
  }
  return `Fresh idea that ${benefitText} and keeps the heavier nutrients controlled.`;
}

function scoreCandidate(
  suggestion: FoodSuggestion,
  input: FoodSuggestionRequest,
  sourceWeight: number,
): IdeaCandidate {
  const remaining = computeRemaining(input);
  const proteinScore = remaining.protein > 0 ? Math.min(suggestion.protein / remaining.protein, 1.1) * 2.4 : 0.2;
  const fibreScore = remaining.fibre > 0 ? Math.min(suggestion.fibre / remaining.fibre, 1.1) * 1.8 : 0.2;
  const omegaScore = remaining.omega3 > 0 ? Math.min(suggestion.omega3 / Math.max(remaining.omega3, 1), 1.1) * 1.2 : 0.1;

  const caloriePenalty = getCapPenalty(suggestion.calories, remaining.calories, 2.5);
  const satFatPenalty = getCapPenalty(suggestion.satFat, remaining.satFat, 1.4);
  const sugarPenalty = getCapPenalty(suggestion.addedSugar + suggestion.naturalSugar, remaining.addedSugar + remaining.naturalSugar, 1.2);
  const saltPenalty = getCapPenalty(suggestion.salt, remaining.salt, 1.6);

  return {
    ...suggestion,
    score: sourceWeight + proteinScore + fibreScore + omegaScore - caloriePenalty - satFatPenalty - sugarPenalty - saltPenalty,
  };
}

function getCapPenalty(value: number, remaining: number, weight: number): number {
  if (value <= 0) return 0;
  if (remaining <= 0) return weight;
  const ratio = value / remaining;
  return ratio > 1 ? ratio * weight : ratio * weight * 0.45;
}

function fitsTargets(suggestion: FoodSuggestion, input: FoodSuggestionRequest): boolean {
  const remaining = computeRemaining(input);
  return CAP_KEYS.every((key) => {
    const value = suggestion[key];
    const room = remaining[key];
    if (value <= 0) return true;
    if (room <= 0) {
      return value <= getGentleLimit(key) + 0.0001;
    }
    return value <= room + 0.0001;
  });
}

function computeRemaining(input: FoodSuggestionRequest): Record<GoalKey, number> {
  return {
    calories: round1(input.goals.calories - input.totals.calories),
    protein: round1(input.goals.protein - input.totals.protein),
    carbs: round1(input.goals.carbs - input.totals.carbs),
    fat: round1(input.goals.fat - input.totals.fat),
    satFat: round1(input.goals.satFat - input.totals.satFat),
    fibre: round1(input.goals.fibre - input.totals.fibre),
    addedSugar: round1(input.goals.addedSugar - input.totals.addedSugar),
    naturalSugar: round1(input.goals.naturalSugar - input.totals.naturalSugar),
    salt: round1(input.goals.salt - input.totals.salt),
    alcohol: round1(input.goals.alcohol - input.totals.alcohol),
    omega3: round1(input.goals.omega3 - input.totals.omega3),
  };
}

function scaleSuggestion(
  item: Omit<FoodSuggestion, "source" | "reason">,
  scale: number,
): Omit<FoodSuggestion, "source" | "reason"> {
  const scaledDown = scale < 0.95;
  const prefix = scale < 0.55 ? "Small portion of " : scaledDown ? "Lighter portion of " : "";

  return {
    ...item,
    name: `${prefix}${item.name}`,
    calories: round1(item.calories * scale),
    protein: round1(item.protein * scale),
    carbs: round1(item.carbs * scale),
    fat: round1(item.fat * scale),
    satFat: round1(item.satFat * scale),
    fibre: round1(item.fibre * scale),
    addedSugar: round1(item.addedSugar * scale),
    naturalSugar: round1(item.naturalSugar * scale),
    salt: round1(item.salt * scale),
    alcohol: round1(item.alcohol * scale),
    omega3: round1(item.omega3 * scale),
  };
}

function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const item of items) {
    const key = normalizeName(item.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function normalizeSuggestion(suggestion: FoodSuggestion): FoodSuggestion {
  return {
    ...suggestion,
    name: suggestion.name.trim(),
    reason: suggestion.reason.trim(),
    calories: round1(suggestion.calories),
    protein: round1(suggestion.protein),
    carbs: round1(suggestion.carbs),
    fat: round1(suggestion.fat),
    satFat: round1(suggestion.satFat),
    fibre: round1(suggestion.fibre),
    addedSugar: round1(suggestion.addedSugar),
    naturalSugar: round1(suggestion.naturalSugar),
    salt: round1(suggestion.salt),
    alcohol: round1(suggestion.alcohol),
    omega3: round1(suggestion.omega3),
  };
}

function stripScore(candidate: IdeaCandidate): FoodSuggestion {
  const { score: _score, ...suggestion } = candidate;
  return suggestion;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function formatBenefitLabel(key: typeof DEFICIT_KEYS[number]): string {
  switch (key) {
    case "protein":
      return "protein";
    case "fibre":
      return "fibre";
    case "omega3":
      return "omega-3";
  }
}

function buildGoalGuidance(input: FoodSuggestionRequest): string[] {
  const remaining = computeRemaining(input);
  const notes: string[] = [];
  if (remaining.protein > 0) notes.push(`Protein still needed: ${remaining.protein}g`);
  if (remaining.fibre > 0) notes.push(`Fibre still needed: ${remaining.fibre}g`);
  if (remaining.omega3 > 0) notes.push(`Omega-3 still needed: ${remaining.omega3}mg`);
  if (remaining.calories <= 250) notes.push("Very little calorie room remains, so smaller portions are preferred.");
  if (remaining.calories <= 0) notes.push("Calories are already at or above target, so only very light options should be suggested.");
  if (remaining.addedSugar <= 5) notes.push("Keep added sugar very low.");
  if (remaining.salt <= 1) notes.push("Keep salt modest.");
  return notes;
}

function resolveSuggestionModel(): string {
  return process.env.OPENAI_SUGGESTIONS_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-4o";
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}


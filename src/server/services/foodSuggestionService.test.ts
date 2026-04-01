import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateFoodSuggestions } from "@/server/services/foodSuggestionService";
import { type FoodSuggestionRequest } from "@/server/contracts/foodSuggestions";

const createCompletionMock = vi.fn();

vi.mock("openai", () => {
  class MockAPIError extends Error {
    status?: number;

    constructor(message: string, status?: number) {
      super(message);
      this.status = status;
    }
  }

  return {
    default: class MockOpenAI {
      static APIError = MockAPIError;

      chat = {
        completions: {
          create: createCompletionMock,
        },
      };
    },
  };
});

const baseRequest: FoodSuggestionRequest = {
  date: "2026-04-01",
  goals: {
    calories: 2200,
    protein: 150,
    carbs: 220,
    fat: 70,
    satFat: 20,
    fibre: 30,
    addedSugar: 25,
    naturalSugar: 35,
    salt: 6,
    alcohol: 2,
    omega3: 250,
  },
  totals: {
    calories: 1650,
    protein: 105,
    carbs: 150,
    fat: 52,
    satFat: 13,
    fibre: 18,
    addedSugar: 12,
    naturalSugar: 18,
    salt: 3.5,
    alcohol: 0,
    omega3: 40,
    steps: 8000,
  },
  meals: [
    {
      name: "Chicken rice bowl",
      category: "Lunch",
      calories: 620,
      protein: 42,
      carbs: 58,
      fat: 18,
      satFat: 4.2,
      fibre: 6,
      addedSugar: 1,
      naturalSugar: 3,
      salt: 1.1,
      alcohol: 0,
      omega3: 80,
    },
  ],
  savedMeals: [
    {
      name: "Protein yoghurt bowl",
      category: "Snack",
      calories: 240,
      protein: 24,
      carbs: 22,
      fat: 6,
      satFat: 1.8,
      fibre: 5,
      addedSugar: 0,
      naturalSugar: 12,
      salt: 0.2,
      alcohol: 0,
      omega3: 180,
    },
    {
      name: "Salmon salad",
      category: "Dinner",
      calories: 380,
      protein: 31,
      carbs: 10,
      fat: 23,
      satFat: 4.5,
      fibre: 4,
      addedSugar: 0,
      naturalSugar: 5,
      salt: 0.9,
      alcohol: 0,
      omega3: 1500,
    },
  ],
};

describe("generateFoodSuggestions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createCompletionMock.mockReset();
    delete process.env.OPENAI_SUGGESTIONS_MODEL;
    delete process.env.OPENAI_MODEL;
  });

  it("returns 3 to 5 fallback suggestions when no OpenAI key is configured", async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await generateFoodSuggestions(baseRequest);

    expect(result.suggestions.length).toBeGreaterThanOrEqual(3);
    expect(result.suggestions.length).toBeLessThanOrEqual(5);
    expect(result.suggestions.some((suggestion) => suggestion.source === "new")).toBe(true);
    expect(result.suggestions.every((suggestion) => suggestion.calories <= 550)).toBe(true);
  });

  it("accepts valid AI suggestions and preserves a new idea", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  name: "Protein yoghurt bowl",
                  category: "Snack",
                  source: "template",
                  reason: "Your saved bowl adds protein and still fits your remaining calories.",
                  calories: 240,
                  protein: 24,
                  carbs: 22,
                  fat: 6,
                  satFat: 1.8,
                  fibre: 5,
                  addedSugar: 0,
                  naturalSugar: 12,
                  salt: 0.2,
                  alcohol: 0,
                  omega3: 180,
                },
                {
                  name: "Small portion of Chicken rice bowl",
                  category: "Lunch",
                  source: "logged",
                  reason: "A smaller repeat gives you extra protein without blowing the remaining targets.",
                  calories: 310,
                  protein: 21,
                  carbs: 29,
                  fat: 9,
                  satFat: 2.1,
                  fibre: 3,
                  addedSugar: 0.5,
                  naturalSugar: 1.5,
                  salt: 0.6,
                  alcohol: 0,
                  omega3: 40,
                },
                {
                  name: "Edamame snack pot",
                  category: "Snack",
                  source: "new",
                  reason: "Great way to top up both protein and fibre while staying pretty light.",
                  calories: 190,
                  protein: 17,
                  carbs: 13,
                  fat: 8,
                  satFat: 1.2,
                  fibre: 8,
                  addedSugar: 0,
                  naturalSugar: 2,
                  salt: 0.3,
                  alcohol: 0,
                  omega3: 300,
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await generateFoodSuggestions(baseRequest);

    expect(createCompletionMock).toHaveBeenCalledTimes(1);
    expect(result.suggestions.length).toBeGreaterThanOrEqual(3);
    expect(result.suggestions.length).toBeLessThanOrEqual(5);
    expect(result.suggestions[0].name).toBe("Protein yoghurt bowl");
    expect(result.suggestions.some((suggestion) => suggestion.source === "new")).toBe(true);
  });

  it("falls back cleanly when AI returns suggestions that exceed the remaining caps", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  name: "Large pizza",
                  category: "Dinner",
                  source: "new",
                  reason: "Completely ignore the targets.",
                  calories: 1200,
                  protein: 35,
                  carbs: 130,
                  fat: 48,
                  satFat: 16,
                  fibre: 4,
                  addedSugar: 5,
                  naturalSugar: 6,
                  salt: 4,
                  alcohol: 0,
                  omega3: 0,
                },
                {
                  name: "Milkshake",
                  category: "Snack",
                  source: "new",
                  reason: "Also far too large.",
                  calories: 900,
                  protein: 12,
                  carbs: 100,
                  fat: 35,
                  satFat: 19,
                  fibre: 1,
                  addedSugar: 55,
                  naturalSugar: 10,
                  salt: 1.5,
                  alcohol: 0,
                  omega3: 0,
                },
                {
                  name: "Loaded burger",
                  category: "Dinner",
                  source: "logged",
                  reason: "This would push the day well over.",
                  calories: 1100,
                  protein: 40,
                  carbs: 90,
                  fat: 60,
                  satFat: 22,
                  fibre: 3,
                  addedSugar: 8,
                  naturalSugar: 5,
                  salt: 3.2,
                  alcohol: 0,
                  omega3: 0,
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await generateFoodSuggestions(baseRequest);

    expect(result.suggestions.length).toBeGreaterThanOrEqual(3);
    expect(result.suggestions.every((suggestion) => suggestion.calories <= 550)).toBe(true);
    expect(result.suggestions.some((suggestion) => suggestion.source === "template" || suggestion.source === "logged")).toBe(true);
  });
});


import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { estimateNutrition } from "@/server/services/aiLogService";

describe("estimateNutrition", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createCompletionMock.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("uses Open Food Facts values as authoritative and lets AI fill only missing fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [
          {
            product_name: "Arla Protein Yogurt",
            brands: "Arla",
            nutriments: {
              "energy-kcal_100g": 60,
              "proteins_100g": 10,
              "carbohydrates_100g": 4,
              "fat_100g": 0.2,
              "saturated-fat_100g": 0.1,
              "fiber_100g": 0,
              "sugars_100g": 3.8,
              "salt_100g": 0.1,
            },
          },
        ],
      }),
    }));

    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              name: "AI renamed yogurt",
              category: "Breakfast",
              calories: 999,
              protein: 999,
              carbs: 999,
              fat: 999,
              satFat: 999,
              fibre: 999,
              addedSugar: 1.5,
              naturalSugar: 4.2,
              salt: 999,
              alcohol: 0,
              omega3: 0,
            }),
          },
        },
      ],
    });

    const result = await estimateNutrition({ mode: "describe", description: "150g protein yogurt", modelTier: "balanced" });

    expect(result).toEqual({
      name: "Arla Protein Yogurt",
      category: "Breakfast",
      calories: 90,
      protein: 15,
      carbs: 6,
      fat: 0.3,
      satFat: 0.2,
      fibre: 0,
      addedSugar: 1.5,
      naturalSugar: 4.2,
      salt: 0.2,
      alcohol: 0,
      omega3: 0,
    });
    expect(createCompletionMock).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-4o-mini" }));
  });

  it("falls back to AI-only estimation when Open Food Facts does not find a confident match", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [
          {
            product_name: "Completely Different Product",
            brands: "Other Brand",
            nutriments: {
              "energy-kcal_100g": 400,
              "proteins_100g": 12,
              "carbohydrates_100g": 50,
              "fat_100g": 15,
            },
          },
        ],
      }),
    }));

    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              name: "Chicken breast with rice",
              category: "Dinner",
              calories: 540,
              protein: 43,
              carbs: 55,
              fat: 14,
              satFat: 3,
              fibre: 5,
              addedSugar: 1,
              naturalSugar: 2,
              salt: 0.8,
              alcohol: 0,
              omega3: 120,
            }),
          },
        },
      ],
    });

    const result = await estimateNutrition({ mode: "describe", description: "200g chicken breast with rice", modelTier: "accurate" });

    expect(result.name).toBe("Chicken breast with rice");
    expect(result.calories).toBe(540);
    expect(createCompletionMock).toHaveBeenCalledTimes(1);
    expect(createCompletionMock).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-4o" }));
  });

  it("returns an Open Food Facts fallback when AI is unavailable but OFF matched a product", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [
          {
            product_name: "Protein Yogurt",
            brands: "Arla",
            nutriments: {
              "energy-kcal_100g": 60,
              "proteins_100g": 10,
              "carbohydrates_100g": 4,
              "fat_100g": 0.2,
              "saturated-fat_100g": 0.1,
              "sugars_100g": 3.8,
              "salt_100g": 0.1,
            },
          },
        ],
      }),
    }));

    delete process.env.OPENAI_API_KEY;

    const result = await estimateNutrition({ mode: "describe", description: "150g protein yogurt", modelTier: "balanced" });

    expect(result).toEqual({
      name: "Protein Yogurt",
      category: "Breakfast",
      calories: 90,
      protein: 15,
      carbs: 6,
      fat: 0.3,
      satFat: 0.2,
      fibre: 0,
      addedSugar: 0,
      naturalSugar: 5.7,
      salt: 0.2,
      alcohol: 0,
      omega3: 0,
    });
  });

  it("ignores Open Food Facts lookup failures and still uses AI", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              name: "Homemade pasta",
              category: "Dinner",
              calories: 620,
              protein: 24,
              carbs: 84,
              fat: 18,
              satFat: 5,
              fibre: 7,
              addedSugar: 3,
              naturalSugar: 4,
              salt: 1.1,
              alcohol: 0,
              omega3: 40,
            }),
          },
        },
      ],
    });

    const result = await estimateNutrition({ mode: "describe", description: "homemade pasta", modelTier: "balanced" });

    expect(result.name).toBe("Homemade pasta");
    expect(result.calories).toBe(620);
    expect(createCompletionMock).toHaveBeenCalledTimes(1);
  });

  it("looks up barcode products without spending AI tokens", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 1,
        product: {
          product_name: "Coca-Cola Zero Sugar",
          nutriments: {
            "energy-kcal_100g": 1,
            "proteins_100g": 0,
            "carbohydrates_100g": 0,
            "fat_100g": 0,
            "saturated-fat_100g": 0,
            "fiber_100g": 0,
            "sugars_100g": 0,
            "salt_100g": 0.02,
          },
          serving_quantity: 330,
        },
      }),
    }));

    const result = await estimateNutrition({ mode: "barcode", barcode: "5449000000996", amount: 330, modelTier: "accurate" });

    expect(result).toEqual({
      name: "Coca-Cola Zero Sugar",
      category: "Other",
      calories: 3.3,
      protein: 0,
      carbs: 0,
      fat: 0,
      satFat: 0,
      fibre: 0,
      addedSugar: 0,
      naturalSugar: 0,
      salt: 0.1,
      alcohol: 0,
      omega3: 0,
    });
    expect(createCompletionMock).not.toHaveBeenCalled();
  });
});

import { z } from "zod";
import { nutritionInputSchema, dateStringSchema } from "@/server/contracts/common";
import { MEAL_CATEGORIES } from "@/server/contracts/meals";

const categorySchema = z.enum(MEAL_CATEGORIES).nullable();

export const suggestionContextMealSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: categorySchema,
  ...nutritionInputSchema.shape,
});

export const suggestionGoalsSchema = z.object({
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  satFat: z.number().min(0),
  fibre: z.number().min(0),
  addedSugar: z.number().min(0),
  naturalSugar: z.number().min(0),
  salt: z.number().min(0),
  alcohol: z.number().min(0),
  omega3: z.number().min(0),
});

export const suggestionTotalsSchema = suggestionGoalsSchema.extend({
  steps: z.number().min(0).optional(),
});

export const foodSuggestionRequestSchema = z.object({
  date: dateStringSchema,
  goals: suggestionGoalsSchema,
  totals: suggestionTotalsSchema,
  meals: z.array(suggestionContextMealSchema).max(20).default([]),
  savedMeals: z.array(suggestionContextMealSchema).max(40).default([]),
});

export const foodSuggestionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: categorySchema,
  source: z.enum(["logged", "template", "new"]),
  reason: z.string().trim().min(8).max(220),
  ...nutritionInputSchema.shape,
});

export const foodSuggestionSectionItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  note: z.string().trim().min(1).max(160),
});

export const foodSuggestionSectionSchema = z.object({
  nutrient: z.enum(["protein", "fibre", "omega3"]),
  label: z.string().trim().min(1).max(100),
  items: z.array(foodSuggestionSectionItemSchema).min(1).max(8),
});

export const foodSuggestionResponseSchema = z.object({
  suggestions: z.array(foodSuggestionSchema).min(3).max(5),
  sections: z.array(foodSuggestionSectionSchema).optional(),
});

export type FoodSuggestionRequest = z.infer<typeof foodSuggestionRequestSchema>;
export type FoodSuggestion = z.infer<typeof foodSuggestionSchema>;
export type FoodSuggestionSection = z.infer<typeof foodSuggestionSectionSchema>;
export type FoodSuggestionSectionItem = z.infer<typeof foodSuggestionSectionItemSchema>;
export type FoodSuggestionResponse = z.infer<typeof foodSuggestionResponseSchema>;


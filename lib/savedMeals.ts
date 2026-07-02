import { GOAL_FIELDS, type Goals } from "./goals";
import type { FoodResult } from "./foodSearch";

export interface SavedMeal {
  id: string;
  name: string;
}

// A food stored inside a saved meal: full nutrient snapshot minus the per-log
// fields (meal slot and loggedAt) — those are supplied at apply-time.
export type SavedMealFoodNutrients = Goals;

export interface SavedMealFood extends SavedMealFoodNutrients {
  id: string;
  foodName: string;
  servingDescription: string;
  grams: number;
}

export type NewSavedMealFood = Omit<SavedMealFood, "id">;

export interface SavedMealFoodInput {
  food: FoodResult;
  portion: { label: string; grams: number };
  quantity: number;
}

export function parseSavedMealFoodInput(body: unknown): SavedMealFoodInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  if (typeof b.quantity !== "number" || !Number.isFinite(b.quantity) || b.quantity <= 0)
    return null;

  const portion = b.portion as Record<string, unknown> | undefined;
  if (
    !portion ||
    typeof portion.label !== "string" ||
    typeof portion.grams !== "number" ||
    !Number.isFinite(portion.grams) ||
    portion.grams <= 0
  )
    return null;

  const food = b.food as Record<string, unknown> | undefined;
  if (!food || typeof food.foodName !== "string" || !food.foodName) return null;

  return {
    food: food as unknown as FoodResult,
    portion: { label: portion.label, grams: portion.grams },
    quantity: b.quantity,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const trimQty = (n: number) => String(Number(n.toFixed(2)));

export function computeSavedMealFood(input: SavedMealFoodInput): NewSavedMealFood {
  const { food, portion, quantity } = input;
  const grams = round1(portion.grams * quantity);
  const scale = (portion.grams * quantity) / 100;

  const nutrients = {} as SavedMealFoodNutrients;
  for (const key of GOAL_FIELDS) {
    nutrients[key] = round1((food[key] ?? 0) * scale);
  }

  const servingDescription =
    portion.label === "grams"
      ? `${grams} g`
      : `${trimQty(quantity)} × ${portion.label} (${grams}g)`;

  return { foodName: food.foodName, servingDescription, grams, ...nutrients };
}

// Pure log-entry model for the daily journal. An entry is an immutable
// nutritional snapshot computed at log time (issue #6, story 30): nutrient
// values are frozen from the food's per-100g figures and never re-fetched or
// edited — corrections are delete + re-add.

import { GOAL_FIELDS, type Goals } from "./goals";
import type { FoodResult } from "./foodSearch";

export const MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const;
export type Meal = (typeof MEALS)[number];

// The snapshot reuses the 11 goal/nutrient fields, so consumed totals line up
// directly with MacroHeader / MicroDetails' `consumed` prop.
export type Nutrients = Goals;

export interface LogEntry extends Nutrients {
  id: string;
  meal: Meal;
  foodName: string;
  servingDescription: string;
  grams: number;
}

// The snapshot as written at log time, before Firestore assigns an id.
export type NewLogEntry = Omit<LogEntry, "id">;

export interface ComputeEntryInput {
  food: FoodResult;
  meal: Meal;
  portion: { label: string; grams: number };
  quantity: number;
}

// Validate a POST body into ComputeEntryInput, or null if malformed. Nutrient
// fields on `food` are not re-validated here — computeEntry coerces missing
// values to 0 — but the structural fields that drive the math must be sound.
export function parseEntryInput(body: unknown): ComputeEntryInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  if (!MEALS.includes(b.meal as Meal)) return null;
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
    meal: b.meal as Meal,
    portion: { label: portion.label, grams: portion.grams },
    quantity: b.quantity,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const trimQty = (n: number) => String(Number(n.toFixed(2)));

// Compute the immutable snapshot for a logged food. Every nutrient is
// (per-100g value) × (portionGrams / 100) × quantity, rounded to 1 decimal.
export function computeEntry(input: ComputeEntryInput): NewLogEntry {
  const { food, meal, portion, quantity } = input;
  const grams = round1(portion.grams * quantity);
  const scale = (portion.grams * quantity) / 100;

  const nutrients = {} as Nutrients;
  for (const key of GOAL_FIELDS) {
    nutrients[key] = round1((food[key] ?? 0) * scale);
  }

  const servingDescription =
    portion.label === "grams"
      ? `${grams} g`
      : `${trimQty(quantity)} × ${portion.label} (${grams}g)`;

  return { meal, foodName: food.foodName, servingDescription, grams, ...nutrients };
}

// Total every nutrient across a day's entries into a consumed map keyed exactly
// like Goals — feeds MacroHeader / MicroDetails' `consumed` prop.
export function sumConsumed(entries: Nutrients[]): Nutrients {
  const totals = {} as Nutrients;
  for (const key of GOAL_FIELDS) {
    totals[key] = entries.reduce((sum, e) => sum + (e[key] ?? 0), 0);
  }
  return totals;
}

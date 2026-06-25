// Pure goals model + validation. No server/Firestore deps, so both the API
// route and client modals can import it. See issue #3.

export interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  potassium: number;
  sugar: number;
  cholesterol: number;
  calcium: number;
  iron: number;
}

export const GOAL_FIELDS = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sodium",
  "potassium",
  "sugar",
  "cholesterol",
  "calcium",
  "iron",
] as const satisfies readonly (keyof Goals)[];

// Returns a normalized Goals (only the known fields) when every field is a
// finite, non-negative number; otherwise null.
export function parseGoals(input: unknown): Goals | null {
  if (typeof input !== "object" || input === null) return null;
  const rec = input as Record<string, unknown>;

  const out = {} as Goals;
  for (const field of GOAL_FIELDS) {
    const value = rec[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return null;
    }
    out[field] = value;
  }
  return out;
}

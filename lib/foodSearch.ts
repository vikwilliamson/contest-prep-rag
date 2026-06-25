// Food search: fan out to USDA FoodData Central and Open Food Facts in
// parallel, normalize both into one per-100g contract, and merge (USDA first,
// then Open Food Facts), de-duplicating by name. A single-source failure never
// fails the search — the failing source just contributes nothing.
//
// All nutrient values are per 100g. Macros are always numbers (0 when absent);
// micros are number | null (null when the source omits them). Mineral micros
// are expressed in mg to match the goals/journal display units.

export interface FoodResult {
  id: string;
  source: "usda" | "off";
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sodium: number | null;
  potassium: number | null;
  sugar: number | null;
  cholesterol: number | null;
  calcium: number | null;
  iron: number | null;
  portions: Array<{ label: string; grams: number }>;
}

const GRAMS_PORTION = { label: "grams", grams: 1 } as const;

// ── USDA FoodData Central ─────────────────────────────────────────────────────

// Stable USDA nutrient numbers (don't change across foods/datasets).
const USDA_NUTRIENT = {
  calories: "208",
  protein: "203",
  carbs: "205",
  fat: "204",
  fiber: "291",
  sodium: "307",
  potassium: "306",
  sugar: "269",
  cholesterol: "601",
  calcium: "301",
  iron: "303",
} as const;

interface UsdaFood {
  fdcId: number;
  description: string;
  foodNutrients?: Array<{ nutrientNumber: string; value: number }>;
  // Foundation/SR/Survey foods carry named portions here…
  foodMeasures?: Array<{ disseminationText: string; gramWeight: number }>;
  // …Branded foods carry a single serving here instead.
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
}

function normalizeUsda(food: UsdaFood): FoodResult {
  const byNumber = new Map(
    (food.foodNutrients ?? []).map((n) => [n.nutrientNumber, n.value])
  );
  const num = (key: keyof typeof USDA_NUTRIENT): number =>
    byNumber.get(USDA_NUTRIENT[key]) ?? 0;
  const micro = (key: keyof typeof USDA_NUTRIENT): number | null =>
    byNumber.has(USDA_NUTRIENT[key]) ? byNumber.get(USDA_NUTRIENT[key])! : null;

  const portions = (food.foodMeasures ?? [])
    .filter((m) => m.gramWeight > 0)
    .map((m) => ({ label: m.disseminationText, grams: m.gramWeight }));

  // Branded foods expose one gram-based serving outside foodMeasures.
  if (
    food.servingSize &&
    food.servingSize > 0 &&
    food.servingSizeUnit?.toLowerCase().startsWith("g")
  ) {
    portions.push({
      label: food.householdServingFullText?.trim()
        ? food.householdServingFullText
        : `${food.servingSize} g`,
      grams: food.servingSize,
    });
  }

  return {
    id: `usda-${food.fdcId}`,
    source: "usda",
    foodName: food.description,
    calories: num("calories"),
    protein: num("protein"),
    carbs: num("carbs"),
    fat: num("fat"),
    fiber: micro("fiber"),
    sodium: micro("sodium"),
    potassium: micro("potassium"),
    sugar: micro("sugar"),
    cholesterol: micro("cholesterol"),
    calcium: micro("calcium"),
    iron: micro("iron"),
    portions: [...portions, GRAMS_PORTION],
  };
}

async function searchUsda(query: string): Promise<FoodResult[]> {
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search` +
    `?api_key=${process.env.USDA_API_KEY ?? ""}` +
    `&query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USDA ${res.status}`);
  const data = (await res.json()) as { foods?: UsdaFood[] };
  return (data.foods ?? []).map(normalizeUsda);
}

// ── Open Food Facts ───────────────────────────────────────────────────────────

interface OffProduct {
  code: string;
  product_name?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: Record<string, number>;
}

// OFF stores minerals in grams per 100g; convert to mg to match our units.
function normalizeOff(product: OffProduct): FoodResult {
  const nut = product.nutriments ?? {};
  const g = (key: string): number | null =>
    typeof nut[`${key}_100g`] === "number" ? nut[`${key}_100g`] : null;
  const mg = (key: string): number | null => {
    const v = g(key);
    return v === null ? null : v * 1000;
  };

  const portions: FoodResult["portions"] = [];
  if (product.serving_size && (product.serving_quantity ?? 0) > 0) {
    portions.push({
      label: product.serving_size,
      grams: product.serving_quantity!,
    });
  }

  return {
    id: `off-${product.code}`,
    source: "off",
    foodName: product.product_name ?? "",
    calories: nut["energy-kcal_100g"] ?? 0,
    protein: nut.proteins_100g ?? 0,
    carbs: nut.carbohydrates_100g ?? 0,
    fat: nut.fat_100g ?? 0,
    fiber: g("fiber"),
    sodium: mg("sodium"),
    potassium: mg("potassium"),
    sugar: g("sugars"),
    cholesterol: mg("cholesterol"),
    calcium: mg("calcium"),
    iron: mg("iron"),
    portions: [...portions, GRAMS_PORTION],
  };
}

async function searchOff(query: string): Promise<FoodResult[]> {
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl` +
    `?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=20`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OFF ${res.status}`);
  const data = (await res.json()) as { products?: OffProduct[] };
  return (data.products ?? []).filter((p) => p.product_name).map(normalizeOff);
}

// ── Merge ─────────────────────────────────────────────────────────────────────

export async function searchFoods(query: string): Promise<FoodResult[]> {
  // Both calls are kicked off before either is awaited (parallel fan-out).
  // Each source tolerates its own failure so one outage can't fail the search.
  const [usda, off] = await Promise.all([
    searchUsda(query).catch(() => [] as FoodResult[]),
    searchOff(query).catch(() => [] as FoodResult[]),
  ]);

  const seen = new Set<string>();
  const merged: FoodResult[] = [];
  for (const result of [...usda, ...off]) {
    const key = result.foodName.toLowerCase();
    if (seen.has(key)) continue; // USDA comes first, so its entry wins
    seen.add(key);
    merged.push(result);
  }
  return merged;
}

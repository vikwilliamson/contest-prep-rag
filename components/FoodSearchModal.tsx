"use client";

import { useState, type FormEvent } from "react";
import type { FoodResult } from "../lib/foodSearch";
import { GOAL_FIELDS } from "../lib/goals";
import type { Meal } from "../lib/entries";

const NUTRIENT_LABELS: Record<(typeof GOAL_FIELDS)[number], string> = {
  calories: "Calories",
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
  fiber: "Fiber",
  sodium: "Sodium",
  potassium: "Potassium",
  sugar: "Sugar",
  cholesterol: "Cholesterol",
  calcium: "Calcium",
  iron: "Iron",
};

export interface FoodSelection {
  food: FoodResult;
  portion: { label: string; grams: number };
  quantity: number;
}

const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

function macroSummary(f: FoodResult): string {
  return `${f.calories} cal · ${f.protein} g P · ${f.carbs} g C · ${f.fat} g F`;
}

export default function FoodSearchModal({
  meal,
  onConfirm,
  onClose,
}: {
  meal: Meal;
  onConfirm: (selection: FoodSelection) => void | Promise<void>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [portionIndex, setPortionIndex] = useState(0);
  const [quantity, setQuantity] = useState("1");

  async function runSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setSearching(false);
    }
  }

  function select(food: FoodResult) {
    setSelected(food);
    setPortionIndex(0);
    setQuantity("1");
  }

  function confirm() {
    if (!selected) return;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return;
    onConfirm({ food: selected, portion: selected.portions[portionIndex], quantity: qty });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Add food to ${MEAL_LABELS[meal]}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-lg bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Add to {MEAL_LABELS[meal]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 text-sm text-zinc-600 dark:text-zinc-300"
          >
            Cancel
          </button>
        </div>

        {selected ? (
          <div className="flex-1 overflow-auto p-4">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mb-3 text-sm text-zinc-500 dark:text-zinc-400"
            >
              ‹ Back to results
            </button>
            <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-50">
              {selected.foodName}
            </h3>
            <p className="mb-3 text-xs text-zinc-400">per 100g</p>

            <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {GOAL_FIELDS.map((key) => (
                <div key={key} className="flex justify-between">
                  <dt className="text-zinc-600 dark:text-zinc-400">
                    {NUTRIENT_LABELS[key]}
                  </dt>
                  <dd className="text-zinc-900 dark:text-zinc-50">
                    {selected[key] ?? 0}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                Portion
                <select
                  aria-label="Portion"
                  value={portionIndex}
                  onChange={(e) => setPortionIndex(Number(e.target.value))}
                  className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {selected.portions.map((p, i) => (
                    <option key={`${p.label}-${i}`} value={i}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex w-24 flex-col gap-1 text-sm">
                Quantity
                <input
                  aria-label="Quantity"
                  type="number"
                  min="0"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={confirm}
              className="mt-5 w-full rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Add
            </button>
          </div>
        ) : (
          <>
            <form role="search" onSubmit={runSearch} className="flex gap-2 px-4">
              <input
                aria-label="Search foods"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search foods…"
                className="flex-1 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button
                type="submit"
                className="rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Search
              </button>
            </form>

            <ul className="flex-1 overflow-auto p-4">
              {searching && <li className="text-sm text-zinc-500">Searching…</li>}
              {results.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    onClick={() => select(food)}
                    className="w-full border-b border-zinc-100 py-2 text-left dark:border-zinc-800"
                  >
                    <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {food.foodName}
                    </span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {macroSummary(food)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

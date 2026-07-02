"use client";

import { useEffect, useState } from "react";
import { authFetch } from "../lib/authFetch";
import type { SavedMeal, SavedMealFood } from "../lib/savedMeals";
import type { Meal } from "../lib/entries";

const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

export default function SavedMealPicker({
  meal,
  onClose,
  onApply,
}: {
  meal: Meal;
  onClose: () => void;
  onApply: (foods: SavedMealFood[]) => void;
}) {
  const [meals, setMeals] = useState<SavedMeal[]>([]);

  useEffect(() => {
    authFetch("/api/journal/saved-meals")
      .then((r) => r.json())
      .then((d) => setMeals(d.meals));
  }, []);

  async function apply(mealId: string) {
    const res = await authFetch(`/api/journal/saved-meals/${mealId}/foods`);
    const { foods } = await res.json();
    onApply(foods);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Add saved meal to ${MEAL_LABELS[meal]}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-lg bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Add saved meal
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 text-sm text-zinc-600 dark:text-zinc-300"
          >
            Cancel
          </button>
        </div>

        <ul className="flex-1 overflow-auto p-4 flex flex-col gap-2">
          {meals.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => apply(m.id)}
                className="w-full rounded border border-zinc-200 px-3 py-2 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {m.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

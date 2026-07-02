"use client";

import { useEffect, useState } from "react";
import type { SavedMeal, SavedMealFood } from "../lib/savedMeals";

interface MealWithFoods extends SavedMeal {
  foods?: SavedMealFood[];
  expanded: boolean;
  renaming: boolean;
  renameValue: string;
}

export default function SavedMealsModal({ onClose }: { onClose: () => void }) {
  const [meals, setMeals] = useState<MealWithFoods[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetch("/api/journal/saved-meals")
      .then((r) => r.json())
      .then((d) =>
        setMeals(
          (d.meals as SavedMeal[]).map((m) => ({
            ...m,
            expanded: false,
            renaming: false,
            renameValue: m.name,
          }))
        )
      );
  }, []);

  async function createMeal() {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch("/api/journal/saved-meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const { meal } = await res.json();
    setMeals((prev) => [...prev, { ...meal, expanded: false, renaming: false, renameValue: meal.name }]);
    setNewName("");
  }

  async function saveName(mealId: string) {
    const meal = meals.find((m) => m.id === mealId);
    if (!meal) return;
    const name = meal.renameValue.trim();
    if (!name) return;
    await fetch(`/api/journal/saved-meals/${mealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setMeals((prev) =>
      prev.map((m) => (m.id === mealId ? { ...m, name, renaming: false } : m))
    );
  }

  async function deleteMeal(mealId: string) {
    await fetch(`/api/journal/saved-meals/${mealId}`, { method: "DELETE" });
    setMeals((prev) => prev.filter((m) => m.id !== mealId));
  }

  async function expand(mealId: string) {
    const already = meals.find((m) => m.id === mealId);
    if (already?.expanded) {
      setMeals((prev) => prev.map((m) => (m.id === mealId ? { ...m, expanded: false } : m)));
      return;
    }
    const res = await fetch(`/api/journal/saved-meals/${mealId}/foods`);
    const { foods } = await res.json();
    setMeals((prev) =>
      prev.map((m) => (m.id === mealId ? { ...m, expanded: true, foods } : m))
    );
  }

  async function removeFood(mealId: string, foodId: string) {
    await fetch(`/api/journal/saved-meals/${mealId}/foods/${foodId}`, { method: "DELETE" });
    setMeals((prev) =>
      prev.map((m) =>
        m.id === mealId
          ? { ...m, foods: (m.foods ?? []).filter((f) => f.id !== foodId) }
          : m
      )
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Saved meals"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-lg bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Saved Meals</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 text-sm text-zinc-600 dark:text-zinc-300"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Create new meal */}
          <div className="mb-4 flex gap-2">
            <label className="sr-only" htmlFor="new-meal-name">New meal name</label>
            <input
              id="new-meal-name"
              aria-label="New meal name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New meal name"
              className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button
              type="button"
              aria-label="Create meal"
              onClick={createMeal}
              className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
            >
              Create
            </button>
          </div>

          {/* Meal list */}
          <ul className="flex flex-col gap-3">
            {meals.map((m) => (
              <li key={m.id} className="rounded border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 p-2">
                  {m.renaming ? (
                    <>
                      <input
                        type="text"
                        value={m.renameValue}
                        onChange={(e) =>
                          setMeals((prev) =>
                            prev.map((x) =>
                              x.id === m.id ? { ...x, renameValue: e.target.value } : x
                            )
                          )
                        }
                        className="flex-1 rounded border border-zinc-300 px-2 py-0.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <button
                        type="button"
                        aria-label="Save rename"
                        onClick={() => saveName(m.id)}
                        className="text-xs text-zinc-600 dark:text-zinc-300"
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-label={`Expand ${m.name}`}
                        onClick={() => expand(m.id)}
                        className="flex-1 text-left text-sm font-medium text-zinc-800 dark:text-zinc-200"
                      >
                        {m.name}
                      </button>
                      <button
                        type="button"
                        aria-label={`Rename ${m.name}`}
                        onClick={() =>
                          setMeals((prev) =>
                            prev.map((x) => (x.id === m.id ? { ...x, renaming: true } : x))
                          )
                        }
                        className="text-xs text-zinc-500"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${m.name}`}
                        onClick={() => deleteMeal(m.id)}
                        className="text-xs text-zinc-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>

                {m.expanded && (
                  <ul className="border-t border-zinc-100 px-2 pb-2 dark:border-zinc-800">
                    {(m.foods ?? []).map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-2 py-1 text-sm">
                        <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300">{f.foodName}</span>
                        <span className="text-xs text-zinc-500">{f.servingDescription}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${f.foodName}`}
                          onClick={() => removeFood(m.id, f.id)}
                          className="text-zinc-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

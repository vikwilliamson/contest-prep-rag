"use client";

import { useEffect, useState } from "react";
import MacroHeader from "../../../components/MacroHeader";
import MicroDetails from "../../../components/MicroDetails";
import GoalsModal from "../../../components/GoalsModal";
import FoodSearchModal, {
  type FoodSelection,
} from "../../../components/FoodSearchModal";
import SavedMealsModal from "../../../components/SavedMealsModal";
import SavedMealPicker from "../../../components/SavedMealPicker";
import type { Goals } from "../../../lib/goals";
import {
  sumConsumed,
  MEALS as MEAL_KEYS,
  type LogEntry,
  type Meal,
} from "../../../lib/entries";
import type { SavedMealFood } from "../../../lib/savedMeals";
import { todayKey, addDays, formatDateKey, isToday } from "../../../lib/date";

const MEALS: { key: Meal; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snacks", label: "Snacks" },
];

export default function JournalPage() {
  const [goals, setGoals] = useState<Goals | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [managingSaved, setManagingSaved] = useState(false);
  const [date, setDate] = useState(todayKey);
  const [picking, setPicking] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [adding, setAdding] = useState<Meal | null>(null);
  const [pickingSaved, setPickingSaved] = useState<Meal | null>(null);

  useEffect(() => {
    fetch("/api/journal/goals")
      .then((r) => r.json())
      .then((d) => setGoals(d.goals))
      .finally(() => setLoading(false));
  }, []);

  // Re-fetch the day's entries whenever the date changes (once goals exist).
  useEffect(() => {
    if (!goals) return;
    let cancelled = false;
    fetch(`/api/journal/${date}/entries`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const byMeal = d.entries ?? {};
        setEntries(MEAL_KEYS.flatMap((m) => byMeal[m] ?? []));
      });
    return () => { cancelled = true; };
  }, [date, goals]);

  async function addFood(sel: FoodSelection) {
    if (!adding) return;
    // Dismiss modal before the first await so findByText waits for the entry
    // row rather than the detail panel h3 still mounted in the modal.
    setAdding(null);
    const res = await fetch(`/api/journal/${date}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sel, meal: adding }),
    });
    const { entry } = await res.json();
    setEntries((prev) => [...prev, entry]);
  }

  async function applySavedMeal(meal: Meal, foods: SavedMealFood[]) {
    setPickingSaved(null);
    const written = await Promise.all(
      foods.map((food) =>
        fetch(`/api/journal/${date}/entries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ food, meal, portion: { label: "grams", grams: food.grams }, quantity: 1 }),
        }).then((r) => r.json()).then((d) => d.entry as LogEntry)
      )
    );
    setEntries((prev) => [...prev, ...written]);
  }

  async function removeEntry(id: string) {
    await fetch(`/api/journal/${date}/entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function save(next: Goals) {
    await fetch("/api/journal/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setGoals(next);
    setEditing(false);
  }

  if (loading) {
    return <p className="p-6 text-sm text-zinc-500">Loading…</p>;
  }

  // First-time user: onboarding modal blocks the page until goals are saved.
  if (!goals) {
    return <GoalsModal onSave={save} />;
  }

  const consumed = sumConsumed(entries);

  return (
    <main className="flex flex-1 min-h-0 flex-col overflow-auto">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Journal
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setManagingSaved(true)}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Saved Meals
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Goals
          </button>
        </div>
      </div>

      <nav className="flex items-center justify-between gap-2 px-4 pb-2">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => setDate((d) => addDays(d, -1))}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          ‹
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {formatDateKey(date)}
          </button>
          {picking && (
            <input
              type="date"
              aria-label="Pick a date"
              value={date}
              autoFocus
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
                setPicking(false);
              }}
              className="absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          )}
        </div>
        <button
          type="button"
          aria-label="Next day"
          disabled={isToday(date)}
          onClick={() => setDate((d) => addDays(d, 1))}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-30 dark:border-zinc-700"
        >
          ›
        </button>
      </nav>

      <MacroHeader goals={goals} consumed={consumed} />
      <MicroDetails goals={goals} consumed={consumed} />

      <div className="flex flex-col gap-4 p-4">
        {MEALS.map(({ key, label }) => {
          const mealEntries = entries.filter((e) => e.meal === key);
          return (
            <section
              key={key}
              className="rounded border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {label}
              </h3>

              <ul className="mt-2 flex flex-col gap-1">
                {mealEntries.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-200">
                      {e.foodName}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {e.servingDescription}
                    </span>
                    <span className="tabular-nums text-zinc-600 dark:text-zinc-300">
                      {e.calories} cal
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${e.foodName}`}
                      onClick={() => removeEntry(e.id)}
                      className="rounded px-1 text-zinc-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  aria-label={`Add food to ${label}`}
                  onClick={() => setAdding(key)}
                  className="text-sm text-zinc-600 dark:text-zinc-400"
                >
                  + Add food
                </button>
                <button
                  type="button"
                  aria-label={`Add saved meal to ${label}`}
                  onClick={() => setPickingSaved(key)}
                  className="text-sm text-zinc-600 dark:text-zinc-400"
                >
                  + Add saved meal
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {adding && (
        <FoodSearchModal
          meal={adding}
          onConfirm={addFood}
          onClose={() => setAdding(null)}
        />
      )}

      {pickingSaved && (
        <SavedMealPicker
          meal={pickingSaved}
          onApply={(foods) => applySavedMeal(pickingSaved, foods)}
          onClose={() => setPickingSaved(null)}
        />
      )}

      {managingSaved && (
        <SavedMealsModal onClose={() => setManagingSaved(false)} />
      )}

      {editing && (
        <GoalsModal
          initial={goals}
          onSave={save}
          dismissible
          onClose={() => setEditing(false)}
        />
      )}
    </main>
  );
}

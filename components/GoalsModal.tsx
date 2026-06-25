"use client";

import { useState, type FormEvent } from "react";
import { GOAL_FIELDS, parseGoals, type Goals } from "../lib/goals";

const FIELD_LABELS: Record<keyof Goals, string> = {
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

export default function GoalsModal({
  initial,
  onSave,
  dismissible = false,
  onClose,
}: {
  initial?: Goals;
  onSave: (goals: Goals) => void | Promise<void>;
  dismissible?: boolean;
  onClose?: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      GOAL_FIELDS.map((f) => [f, initial ? String(initial[f]) : ""])
    )
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const numeric = Object.fromEntries(
      GOAL_FIELDS.map((f) => [f, values[f] === "" ? NaN : Number(values[f])])
    );
    const goals = parseGoals(numeric);
    if (!goals) {
      setError("Enter a non-negative number for every field.");
      return;
    }
    setError(null);
    onSave(goals);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily goals"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md max-h-full overflow-auto rounded-lg bg-white p-6 dark:bg-zinc-900"
      >
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Daily goals
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {GOAL_FIELDS.map((field) => (
            <div key={field} className="flex flex-col gap-1">
              <label htmlFor={field} className="text-sm text-zinc-700 dark:text-zinc-300">
                {FIELD_LABELS[field]}
              </label>
              <input
                id={field}
                name={field}
                type="number"
                min="0"
                value={values[field]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field]: e.target.value }))
                }
                className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

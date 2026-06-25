"use client";

import { useState } from "react";
import type { Goals } from "../lib/goals";

// NOTE: issue #3 says "gram targets" for all micros, but the values are clearly
// mixed units (e.g. sodium 2300 mg). Displaying physically-correct units here.
const MICROS = [
  { key: "fiber", label: "Fiber", unit: "g" },
  { key: "sodium", label: "Sodium", unit: "mg" },
  { key: "potassium", label: "Potassium", unit: "mg" },
  { key: "sugar", label: "Sugar", unit: "g" },
  { key: "cholesterol", label: "Cholesterol", unit: "mg" },
  { key: "calcium", label: "Calcium", unit: "mg" },
  { key: "iron", label: "Iron", unit: "mg" },
] as const;

export default function MicroDetails({
  goals,
  consumed,
}: {
  goals: Goals;
  consumed?: Partial<Goals>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="border-b border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-2 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Nutrition Details
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-3">
          {MICROS.map(({ key, label, unit }) => {
            const target = goals[key];
            const eaten = consumed?.[key] ?? 0;
            return (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {label}
                </span>
                <progress
                  className="w-full"
                  max={target}
                  value={eaten}
                  aria-label={`${label} progress`}
                />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {eaten} / {target} {unit}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

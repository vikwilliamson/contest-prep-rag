"use client";

import { useEffect, useState } from "react";
import MacroHeader from "../../../components/MacroHeader";
import MicroDetails from "../../../components/MicroDetails";
import GoalsModal from "../../../components/GoalsModal";
import type { Goals } from "../../../lib/goals";

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

export default function JournalPage() {
  const [goals, setGoals] = useState<Goals | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch("/api/journal/goals")
      .then((r) => r.json())
      .then((d) => setGoals(d.goals))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <main className="flex flex-1 min-h-0 flex-col overflow-auto">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Journal
        </h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          Goals
        </button>
      </div>

      <MacroHeader goals={goals} />
      <MicroDetails goals={goals} />

      <div className="flex flex-col gap-4 p-4">
        {MEALS.map((meal) => (
          <section
            key={meal}
            className="rounded border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {meal}
            </h3>
          </section>
        ))}
      </div>

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

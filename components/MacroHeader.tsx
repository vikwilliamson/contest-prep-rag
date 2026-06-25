import { CAL_PER_GRAM, macroPercentOfCalories, type Goals } from "../lib/goals";

const MACROS = [
  { key: "protein", label: "Protein", calPerGram: CAL_PER_GRAM.protein },
  { key: "carbs", label: "Carbs", calPerGram: CAL_PER_GRAM.carbs },
  { key: "fat", label: "Fat", calPerGram: CAL_PER_GRAM.fat },
] as const;

// Consumed values are zero in this slice; they light up once entries are logged.
export default function MacroHeader({
  goals,
  consumed,
}: {
  goals: Goals;
  consumed?: Partial<Goals>;
}) {
  const remaining = goals.calories - (consumed?.calories ?? 0);

  return (
    <header className="flex flex-col gap-3 border-b border-zinc-200 dark:border-zinc-800 p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {remaining}
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          calories remaining
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {MACROS.map(({ key, label, calPerGram }) => {
          const target = goals[key];
          const eaten = consumed?.[key] ?? 0;
          const percent = macroPercentOfCalories(target, calPerGram, goals.calories);
          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {label}
                </span>
                <span className="text-zinc-400">{percent}%</span>
              </div>
              <progress
                className="w-full"
                max={target}
                value={eaten}
                aria-label={`${label} progress`}
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {eaten} / {target} g
              </span>
            </div>
          );
        })}
      </div>
    </header>
  );
}

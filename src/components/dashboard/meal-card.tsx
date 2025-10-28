type MealFood = {
  id: string;
  name: string;
  source: "USDA" | "CUSTOM" | "QUICK_ADD";
  brand?: string | null;
  protein: number;
  carbs: number;
  fats: number;
  calories?: number | null;
  amount?: string | null;
};

export type Meal = {
  id: string;
  name: string;
  timeLabel: string;
  protein: number;
  carbs: number;
  fats: number;
  calories?: number | null;
  notes?: string | null;
  foods: MealFood[];
};

type MealCardProps = {
  meal: Meal;
  onEdit?: (mealId: string) => void;
  onDelete?: (mealId: string) => void;
};

export function MealCard({ meal, onEdit, onDelete }: MealCardProps) {
  const macroPills = [
    {
      label: "P",
      value: meal.protein,
      color: "bg-accent text-background",
    },
    {
      label: "C",
      value: meal.carbs,
      color: "bg-foreground text-background",
    },
    {
      label: "F",
      value: meal.fats,
      color: "bg-muted text-foreground",
    },
  ];

  return (
    <article className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-foreground/50">
            {meal.timeLabel}
          </p>
          <h3 className="text-xl font-semibold text-foreground">{meal.name}</h3>
          {meal.calories ? (
            <p className="text-sm text-foreground/60">{meal.calories} cal</p>
          ) : null}
          {meal.notes ? (
            <p className="mt-2 text-sm text-foreground/60">{meal.notes}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {macroPills.map((pill) => (
            <span
              key={pill.label}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${pill.color}`}
            >
              <span>
                {pill.label}
                <sup className="ml-0.5 text-[10px] font-normal">
                  {pill.value}
                </sup>
              </span>
            </span>
          ))}
          {(onEdit || onDelete) && (
            <div className="flex flex-col items-end gap-2">
              {onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(meal.id)}
                  className="rounded-full border border-foreground/10 px-3 py-1 text-xs font-semibold text-foreground/60 transition hover:border-accent hover:text-accent"
                >
                  Edit
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(meal.id)}
                  className="text-xs font-semibold text-foreground/40 transition hover:text-accent"
                >
                  Delete
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm text-foreground/70">
        {meal.foods.map((food) => (
          <div
            key={food.id}
            className="flex items-center justify-between rounded-2xl bg-muted/60 px-3 py-2"
          >
            <div>
              <p className="font-medium text-foreground">{food.name}</p>
              <p className="text-[11px] uppercase tracking-wide text-foreground/50">
                {[food.brand, food.amount].filter(Boolean).join(" • ")}
              </p>
            </div>
            <div className="flex gap-3 text-xs font-semibold">
              <span className="text-accent">P {food.protein}g</span>
              <span className="text-foreground">C {food.carbs}g</span>
              <span className="text-foreground/70">F {food.fats}g</span>
            </div>
          </div>
        ))}
        {!meal.foods.length && (
          <p className="rounded-2xl border border-dashed border-foreground/20 bg-muted/40 px-3 py-4 text-center text-xs text-foreground/50">
            No foods logged yet. Add items to track macros.
          </p>
        )}
      </div>
    </article>
  );
}

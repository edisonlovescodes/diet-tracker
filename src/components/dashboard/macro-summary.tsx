type MacroType = "protein" | "carbs" | "fats";

const labels: Record<MacroType, string> = {
  protein: "Protein",
  carbs: "Carbs",
  fats: "Fats",
};

const colors: Record<MacroType, string> = {
  protein: "bg-accent text-background",
  carbs: "bg-foreground text-background",
  fats: "bg-muted text-foreground",
};

export type MacroSummaryProps = {
  target: number;
  consumed: number;
  macro: MacroType;
};

export function MacroSummary({ target, consumed, macro }: MacroSummaryProps) {
  const percent =
    target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between text-sm text-foreground/70">
        <span>{labels[macro]}</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-2xl font-semibold text-foreground">
          {consumed}
          <span className="ml-1 text-base font-normal text-foreground/60">
            g
          </span>
        </span>
        <span className="text-sm text-foreground/50">Target {target}g</span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-muted/70">
        <div
          className={`h-2 rounded-full transition-all ${colors[macro]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

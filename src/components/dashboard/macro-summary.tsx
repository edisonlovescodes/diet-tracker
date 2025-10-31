type MacroType = "protein" | "carbs" | "fats";

const labels: Record<MacroType, string> = {
  protein: "Protein",
  carbs: "Carbs",
  fats: "Fats",
};

const gradients: Record<MacroType, string> = {
  protein: "bg-gradient-to-r from-[#fa4616] via-[#ff6c38] to-[#ff9058]",
  carbs: "bg-gradient-to-r from-[#2d9cdb] via-[#45b0ef] to-[#64c7ff]",
  fats: "bg-gradient-to-r from-[#f4c542] via-[#f5a623] to-[#f76b1c]",
};

const tracks: Record<MacroType, string> = {
  protein: "bg-[rgb(250_70_22/0.16)]",
  carbs: "bg-[rgb(45_156_219/0.18)]",
  fats: "bg-[rgb(247_123_32/0.18)]",
};

export type MacroSummaryProps = {
  target: number;
  consumed: number;
  macro: MacroType;
};

export function MacroSummary({ target, consumed, macro }: MacroSummaryProps) {
  const percent = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
  const valueDisplay = Number.isFinite(consumed) ? consumed.toFixed(1) : consumed;
  const trackClass = tracks[macro] ?? "bg-muted/70";
  const fillClass = gradients[macro] ?? "bg-foreground";

  return (
    <div className="surface-card rounded-2xl px-4 py-4">
      <div className="flex items-center justify-between text-sm font-medium text-foreground/75">
        <span className="uppercase tracking-wide">{labels[macro]}</span>
        <span className="text-foreground/60">{percent}%</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-3xl font-semibold text-foreground">
          {valueDisplay}
          <span className="ml-1 text-base font-normal text-foreground/60">g</span>
        </span>
        <span className="text-sm text-foreground/50">Target {target}g</span>
      </div>
      <div
        className={`mt-4 h-2 w-full overflow-hidden rounded-full ${trackClass}`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${labels[macro]} progress`}
      >
        <div className={`h-full ${fillClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

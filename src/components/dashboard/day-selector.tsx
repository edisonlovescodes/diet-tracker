type Day = {
  label: string;
  dateLabel: string;
  isoDate: string;
  isActive?: boolean;
  isComplete?: boolean;
  compliance?: number;
};

type DaySelectorProps = {
  week: number;
  days: Day[];
  onSelect?: (isoDate: string) => void;
};

export function DaySelector({ week, days, onSelect }: DaySelectorProps) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-foreground/60">
        <span>Week {week}</span>
        <span>{days.find((day) => day.isActive)?.dateLabel ?? ""}</span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const state = day.isActive
            ? "active"
            : day.isComplete
              ? "complete"
              : "default";
          return (
            <button
              key={day.label}
              className={[
                "flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-semibold transition-all",
                state === "active" && "bg-foreground text-background shadow-md",
                state === "complete" && "border border-foreground/10 bg-muted/60",
                state === "default" && "text-foreground/40",
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              aria-pressed={day.isActive}
              onClick={() => onSelect?.(day.isoDate)}
            >
              <span>{day.label}</span>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/70">
                {day.dateLabel}
              </span>
              {typeof day.compliance === "number" ? (
                <span className="h-1 w-full overflow-hidden rounded-full bg-background/60">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(100, day.compliance)}%` }}
                  />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

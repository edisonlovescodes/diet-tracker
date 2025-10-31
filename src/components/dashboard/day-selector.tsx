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
    <section className="surface-card rounded-3xl p-5">
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
                state === "active" && "bg-accent text-background shadow-lg shadow-accent/30",
                state === "complete" &&
                  "border border-[color:var(--accent-6)] bg-[color:var(--accent-a3)] text-[color:var(--accent-11)]",
                state === "default" && "text-foreground/40 hover:bg-[color:var(--accent-a2)]/40",
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              aria-pressed={day.isActive}
              onClick={() => onSelect?.(day.isoDate)}
            >
              <span>{day.label}</span>
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  state === "active"
                    ? "bg-background/20 text-background"
                    : "bg-[color:var(--accent-a2)] text-[color:var(--accent-11)]",
                ].join(" ")}
              >
                {day.dateLabel}
              </span>
              {typeof day.compliance === "number" ? (
                <span
                  className={[
                    "h-1 w-full overflow-hidden rounded-full",
                    state === "active" ? "bg-background/30" : "bg-[color:var(--accent-a2)]/40",
                  ].join(" ")}
                >
                  <span
                    className="block h-full rounded-full bg-[color:var(--accent-9)]"
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

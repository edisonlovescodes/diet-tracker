'use client';

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@/lib/session";
import { DaySelector } from "@/components/dashboard/day-selector";
import { MacroSummary } from "@/components/dashboard/macro-summary";
import { MealCard, type Meal } from "@/components/dashboard/meal-card";
import { WeightTrendChart, type WeightPoint } from "@/components/charts/weight-trend";
import { Modal } from "@/components/ui/modal";
import { WeightEntryForm } from "@/components/forms/weight-entry-form";
import { MealForm } from "@/components/forms/meal-form";
import { CustomFoodForm } from "@/components/forms/custom-food-form";
import { SessionProvider } from "@/components/providers/session-provider";
import type {
  EditableMeal,
  EditableCustomFood,
  WeightHistoryEntry,
} from "@/types/nutrition";

type WeekDay = {
  label: string;
  dateLabel: string;
  isoDate: string;
  isActive?: boolean;
  isComplete?: boolean;
  compliance?: number;
};

type MacroBlock = {
  protein: number;
  carbs: number;
  fats: number;
};

type MealDisplay = Meal & {
  notes?: string | null;
};

type DashboardClientProps = {
  session: Session;
  experienceId?: string;
  weekNumber: number;
  weekDays: WeekDay[];
  macroTargets: MacroBlock;
  macroConsumed: MacroBlock;
  meals: MealDisplay[];
  editableMeals: EditableMeal[];
  weightSeries: WeightPoint[];
  weightLogs: WeightHistoryEntry[];
  selectedDateISO: string;
  latestWeight?: WeightHistoryEntry | null;
  weeklyChange?: number | null;
  complianceScore: number;
  streakDays: number;
  customFoods: EditableCustomFood[];
};

export function DashboardClient(props: DashboardClientProps) {
  const {
    session,
    experienceId,
    weekNumber,
    weekDays,
    macroTargets,
    macroConsumed,
    meals,
    editableMeals,
    weightSeries,
    weightLogs,
    selectedDateISO,
    latestWeight,
    weeklyChange,
    complianceScore,
    streakDays,
    customFoods: initialCustomFoods,
  } = props;

  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [weightModal, setWeightModal] = useState<{
    open: boolean;
    entry?: WeightHistoryEntry | null;
  }>({ open: false });
  const [mealModal, setMealModal] = useState<{
    open: boolean;
    meal?: EditableMeal | null;
  }>({ open: false });
  const [customFoodModal, setCustomFoodModal] = useState<{
    open: boolean;
    food?: EditableCustomFood | null;
  }>({ open: false });
  const [customFoods, setCustomFoods] = useState(initialCustomFoods);
  const activeExperienceId = session.experienceId ?? experienceId ?? null;
  const sessionWithExperience = useMemo(
    () => ({ ...session, experienceId: activeExperienceId }),
    [session, activeExperienceId],
  );

  const editableMealMap = useMemo(() => {
    return new Map(editableMeals.map((meal) => [meal.id, meal]));
  }, [editableMeals]);

  function withExperienceHeader(
    headers: Record<string, string> = {},
  ): Record<string, string> {
    if (!activeExperienceId) {
      return headers;
    }
    return {
      ...headers,
      "X-Whop-Experience-Id": activeExperienceId,
    };
  }
  function handleSelectDay(isoDate: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("date", isoDate.split("T")[0]);
    router.push(`?${params.toString()}`);
  }

  function openNewMeal() {
    setMealModal({
      open: true,
      meal: {
        name: "Meal",
        loggedAt: selectedDateISO,
        foods: [],
      },
    });
  }

  function openEditMeal(mealId: string) {
    const meal = editableMealMap.get(mealId);
    if (!meal) return;
    setMealModal({ open: true, meal });
  }

  function handleDeleteMeal(mealId: string) {
    startTransition(async () => {
      const response = await fetch(`/api/meals/${mealId}`, {
        method: "DELETE",
        headers: withExperienceHeader(),
      });
      if (!response.ok) {
        console.error("Failed to delete meal", await response.text());
        return;
      }
      router.refresh();
    });
  }

  function openWeightModal(entry?: WeightHistoryEntry | null) {
    setWeightModal({ open: true, entry: entry ?? null });
  }

  function openCustomFoodModal(food?: EditableCustomFood | null) {
    setCustomFoodModal({ open: true, food: food ?? null });
  }

  function handleCustomFoodSaved(food: EditableCustomFood & { id: string }) {
    setCustomFoods((current) => {
      const existingIndex = current.findIndex((item) => item.id === food.id);
      if (existingIndex >= 0) {
        const clone = [...current];
        clone[existingIndex] = food;
        return clone;
      }
      return [food, ...current];
    });
  }

  const macroBlocks = [
    { macro: "protein" as const, target: macroTargets.protein, consumed: macroConsumed.protein },
    { macro: "carbs" as const, target: macroTargets.carbs, consumed: macroConsumed.carbs },
    { macro: "fats" as const, target: macroTargets.fats, consumed: macroConsumed.fats },
  ];

  return (
    <SessionProvider value={sessionWithExperience}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-10 md:px-6 lg:px-10">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-wide text-foreground/60">
              {new Date(selectedDateISO).toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
            <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
              Dialed-in Nutrition
            </h1>
            {experienceId ? (
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-foreground/40">
                Experience #{experienceId}
              </p>
            ) : null}
            <p className="mt-1 text-sm text-foreground/60">
              Keep logging meals and weigh-ins to stay aligned with your RP targets.
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white px-5 py-3 text-sm shadow-sm shadow-black/5">
            <p className="text-xs uppercase tracking-wide text-foreground/50">
              Today&apos;s Weight
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-foreground">
                {latestWeight ? latestWeight.weightLbs.toFixed(1) : "—"}
              </span>
              <span className="text-sm text-foreground/50">lb</span>
              {typeof weeklyChange === "number" ? (
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    weeklyChange < 0
                      ? "bg-accent/10 text-accent"
                      : "bg-muted text-foreground/60"
                  }`}
                >
                  {weeklyChange < 0 ? "" : "+"}
                  {weeklyChange.toFixed(1)} lb vs last week
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => openWeightModal(latestWeight ?? undefined)}
              className="mt-3 rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-foreground/60 transition hover:border-accent hover:text-accent"
            >
              {latestWeight ? "Edit latest" : "Log weigh-in"}
            </button>
          </div>
        </header>

        <DaySelector week={weekNumber} days={weekDays} onSelect={handleSelectDay} />

        <section className="grid gap-5 lg:grid-cols-3">
          {macroBlocks.map((block) => (
            <MacroSummary
              key={block.macro}
              macro={block.macro}
              target={block.target}
              consumed={block.consumed}
            />
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-5">
            {meals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onEdit={openEditMeal}
                onDelete={handleDeleteMeal}
              />
            ))}
            <button
              type="button"
              onClick={openNewMeal}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-foreground/20 bg-white/60 text-sm font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
            >
              + Log another meal
            </button>
          </div>

          <aside className="flex flex-col gap-5">
            <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Weight Trend
                  </h2>
                  <p className="text-sm text-foreground/60">
                    Stay within 0.5 lb / week for steady fat loss.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openWeightModal()}
                  className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-foreground/60 transition hover:border-accent hover:text-accent"
                >
                  Log weigh-in
                </button>
              </div>
              <div className="mt-4 rounded-2xl border border-black/5 bg-background/60 p-4">
                {weightSeries.length ? (
                  <WeightTrendChart data={weightSeries} />
                ) : (
                  <p className="text-center text-xs text-foreground/50">
                    Add weigh-ins to see your trend.
                  </p>
                )}
              </div>
              {weightLogs.length ? (
                <ul className="mt-4 space-y-2 text-xs text-foreground/70">
                  {weightLogs
                    .slice(-5)
                    .reverse()
                    .map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between rounded-2xl bg-muted/60 px-3 py-2"
                      >
                        <span>
                          {new Date(entry.recordedFor).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => openWeightModal(entry)}
                          className="text-foreground font-semibold"
                        >
                          {entry.weightLbs.toFixed(1)} lb
                        </button>
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>

            <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                Compliance
              </h3>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-4xl font-semibold text-foreground">
                  {Math.round(complianceScore)}%
                </p>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  {streakDays} day streak
                </span>
              </div>
              <p className="mt-2 text-sm text-foreground/60">
                Log every meal to boost streaks. You&apos;re staying on pace with your targets.
              </p>
            </div>

            <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                  My foods
                </h3>
                <button
                  type="button"
                  onClick={() => openCustomFoodModal()}
                  className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-foreground/60 transition hover:border-accent hover:text-accent"
                >
                  Add custom
                </button>
              </div>
              <ul className="mt-3 space-y-2 text-xs text-foreground/70">
                {customFoods.length ? (
                  customFoods.slice(0, 6).map((food) => (
                    <li
                      key={food.id}
                      className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2"
                    >
                      <div>
                        <p className="font-semibold text-foreground">
                          {food.name}
                        </p>
                        <p className="text-[11px] uppercase tracking-wide text-foreground/50">
                          {food.brand || "Custom"} • {food.servingSize}
                          {food.servingUnit}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openCustomFoodModal(food)}
                        className="rounded-full px-3 py-1 text-xs font-semibold text-foreground/40 transition hover:text-accent"
                      >
                        Edit
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl border border-dashed border-foreground/20 bg-muted/30 px-3 py-3 text-center text-[11px] text-foreground/50">
                    Save your go-to meals as custom foods for quicker logging.
                  </li>
                )}
              </ul>
            </div>
          </aside>
        </section>

        <section className="mt-10">
          <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-[#FCF6F5] to-transparent p-6 shadow-sm shadow-black/5">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <a
                  href="https://x.com/edisonisgrowing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/70 transition hover:text-accent"
                >
                  Built by
                  <span className="inline-flex items-center gap-1.5 text-accent">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    @edisonisgrowing
                  </span>
                </a>
                <h3 className="text-lg font-semibold text-foreground">
                  Want an app like this for your community?
                </h3>
                <p className="text-sm leading-6 text-foreground/70">
                  I build custom Whop experiences and dashboards. Text me on X and let’s ship yours next.
                </p>
              </div>
              <a
                href="https://x.com/edisonisgrowing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:bg-accent"
              >
                Text me on X
              </a>
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={weightModal.open}
        title={weightModal.entry ? "Edit weigh-in" : "Log weigh-in"}
        onClose={() => setWeightModal({ open: false })}
      >
        <WeightEntryForm
          initial={weightModal.entry ?? undefined}
          defaultDate={selectedDateISO}
          experienceId={activeExperienceId}
          onClose={() => setWeightModal({ open: false })}
        />
      </Modal>

      <Modal
        open={mealModal.open}
        title={mealModal.meal?.id ? "Edit meal" : "Log meal"}
        onClose={() => setMealModal({ open: false })}
        widthClassName="max-w-3xl"
      >
        {mealModal.meal ? (
          <MealForm
            initial={mealModal.meal}
            defaultDate={selectedDateISO}
            experienceId={activeExperienceId}
            onClose={() => setMealModal({ open: false })}
          />
        ) : null}
      </Modal>

      <Modal
        open={customFoodModal.open}
        title={customFoodModal.food?.id ? "Edit custom food" : "Create custom food"}
        onClose={() => setCustomFoodModal({ open: false })}
      >
        <CustomFoodForm
          initial={customFoodModal.food ?? undefined}
          onClose={() => setCustomFoodModal({ open: false })}
          onSuccess={handleCustomFoodSaved}
          experienceId={activeExperienceId}
        />
      </Modal>
    </SessionProvider>
  );
}

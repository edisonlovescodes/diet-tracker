import type { Prisma } from "@prisma/client";
import type { Meal } from "@/components/dashboard/meal-card";
import type { WeightPoint } from "@/components/charts/weight-trend";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type {
  EditableCustomFood,
  EditableMeal,
  EditableMealFood,
  WeightHistoryEntry,
} from "@/types/nutrition";
import { prisma, PrismaConfigurationError } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/session";

export type DashboardPageProps = {
  experienceId?: string;
  searchParamsPromise?: Promise<{
    date?: string;
  }>;
};

type MealWithFoods = Prisma.MealGetPayload<{ include: { foods: true } }>;

export async function DashboardPage({
  experienceId,
  searchParamsPromise,
}: DashboardPageProps) {
  const session = await getOptionalSession();
  if (!session) {
    return <GuestLanding experienceId={experienceId} />;
  }
  const params = searchParamsPromise ? await searchParamsPromise : undefined;

  const selectedDate = parseSelectedDate(params?.date);
  const dayRange = getDayRange(selectedDate);
  const weekRange = getWeekRange(selectedDate);
  const streakRangeStart = addDays(dayRange.start, -30);

  try {
    const [
      dayMeals,
      weekMeals,
      recentMealDays,
      weightLogs,
      customFoods,
    ] = await Promise.all([
      prisma.meal.findMany({
        where: {
          userId: session.user.id,
          loggedAt: {
            gte: dayRange.start,
            lt: dayRange.end,
          },
        },
        include: { foods: true },
        orderBy: { loggedAt: "asc" },
      }),
      prisma.meal.findMany({
        where: {
          userId: session.user.id,
          loggedAt: {
            gte: weekRange.start,
            lt: weekRange.end,
          },
        },
        include: { foods: true },
      }),
      prisma.meal.findMany({
        where: {
          userId: session.user.id,
          loggedAt: {
            gte: streakRangeStart,
            lt: dayRange.end,
          },
        },
        select: { loggedAt: true },
      }),
      prisma.weightLog.findMany({
        where: { userId: session.user.id },
        orderBy: { recordedFor: "asc" },
      }),
      prisma.customFood.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const meals = dayMeals.map((meal) => mapMealToDisplay(meal));
    const editableMeals = dayMeals.map((meal) => mapMealToEditable(meal));

    const macroConsumed = meals.reduce(
      (acc, meal) => {
        acc.protein += meal.protein;
        acc.carbs += meal.carbs;
        acc.fats += meal.fats;
        return acc;
      },
      { protein: 0, carbs: 0, fats: 0 },
    );

    const weekMealsByDate = aggregateMealsByDate(weekMeals);
    const weekDays = buildWeekDays(
      weekRange.start,
      weekMealsByDate,
      selectedDate,
      session.macroTarget,
    );

    const weightSeries = buildWeightSeries(weightLogs);
    const latestWeight = weightLogs.at(-1) ?? null;
    const weeklyChange = calculateWeeklyChange(weightLogs);
    const complianceScore = calculateCompliance(
      macroConsumed,
      session.macroTarget,
    );
    const streakDays = calculateStreakDays(recentMealDays, dayRange.start);

    const customFoodsFormatted: EditableCustomFood[] = customFoods.map(
      (food) => ({
        id: food.id,
        name: food.name,
        brand: food.brand,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        proteinPerUnit: food.proteinPerUnit,
        carbsPerUnit: food.carbsPerUnit,
        fatsPerUnit: food.fatsPerUnit,
        caloriesPerUnit: food.caloriesPerUnit ?? undefined,
      }),
    );

    const weightHistory: WeightHistoryEntry[] = weightLogs.map((log) => ({
      id: log.id,
      weightLbs: log.weightLbs,
      recordedFor: log.recordedFor.toISOString(),
      note: log.note,
    }));

    return (
      <main className="min-h-screen bg-background">
        <DashboardClient
          session={session}
          experienceId={experienceId}
          weekNumber={getWeekNumber(selectedDate)}
          weekDays={weekDays}
          macroTargets={{
            protein: session.macroTarget?.protein ?? 0,
            carbs: session.macroTarget?.carbs ?? 0,
            fats: session.macroTarget?.fats ?? 0,
          }}
          macroConsumed={macroConsumed}
          meals={meals}
          editableMeals={editableMeals}
          weightSeries={weightSeries}
          weightLogs={weightHistory}
          selectedDateISO={dayRange.start.toISOString()}
          latestWeight={
            latestWeight
              ? {
                  id: latestWeight.id,
                  weightLbs: latestWeight.weightLbs,
                  recordedFor: latestWeight.recordedFor.toISOString(),
                  note: latestWeight.note,
                }
              : null
          }
          weeklyChange={weeklyChange}
          complianceScore={complianceScore}
          streakDays={streakDays}
          customFoods={customFoodsFormatted}
        />
      </main>
    );
  } catch (error) {
    if (error instanceof PrismaConfigurationError) {
      console.warn(
        "[dashboard] Prisma configuration missing; falling back to guest landing.",
      );
      return <GuestLanding experienceId={experienceId} />;
    }

    console.error("[dashboard] Failed to load user data", error);
    return <DashboardUnavailable experienceId={experienceId} />;
  }
}

function parseSelectedDate(value?: string) {
  if (!value) {
    return startOfDay(new Date());
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return startOfDay(new Date());
  }
  return startOfDay(parsed);
}

function getDayRange(date: Date) {
  const start = startOfDay(date);
  const end = addDays(start, 1);
  return { start, end };
}

function getWeekRange(date: Date) {
  const start = startOfWeek(date);
  const end = addDays(start, 7);
  return { start, end };
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as first day
  return addDays(copy, diff);
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function round(value: number, precision = 1) {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function mapMealToDisplay(meal: MealWithFoods): Meal {
  const foods = meal.foods.map((food) => ({
    id: food.id,
    name: food.name,
    source: food.source,
    brand: food.brand ?? undefined,
    protein: round(food.protein ?? 0),
    carbs: round(food.carbs ?? 0),
    fats: round(food.fats ?? 0),
    calories: food.calories ?? undefined,
    amount: formatFoodAmount(food.quantity, food.servingUnit),
  }));

  const proteinTotal = foods.reduce((acc, food) => acc + food.protein, 0);
  const carbsTotal = foods.reduce((acc, food) => acc + food.carbs, 0);
  const fatsTotal = foods.reduce((acc, food) => acc + food.fats, 0);
  const calories = foods.reduce(
    (total, food) => total + (food.calories ?? estimateCalories(food)),
    0,
  );

  return {
    id: meal.id,
    name: meal.name,
    timeLabel: formatTime(meal.loggedAt),
    protein: round(meal.protein ?? proteinTotal),
    carbs: round(meal.carbs ?? carbsTotal),
    fats: round(meal.fats ?? fatsTotal),
    calories: Math.round(calories),
    notes: meal.notes ?? undefined,
    foods,
  } satisfies Meal;
}

function mapMealToEditable(meal: MealWithFoods): EditableMeal {
  const foods: EditableMealFood[] = meal.foods.map((food) => ({
    id: food.id,
    foodId: food.foodId ?? undefined,
    customFoodId: food.customFoodId ?? undefined,
    source: food.source,
    name: food.name,
    brand: food.brand ?? undefined,
    servingUnit: food.servingUnit ?? undefined,
    servingSize: undefined,
    quantity: Number(food.quantity ?? 1),
    macrosPerUnit: {
      protein: divide(food.protein ?? 0, food.quantity ?? 1),
      carbs: divide(food.carbs ?? 0, food.quantity ?? 1),
      fats: divide(food.fats ?? 0, food.quantity ?? 1),
      calories: food.calories ? divide(food.calories, food.quantity ?? 1) : null,
    },
  }));

  return {
    id: meal.id,
    name: meal.name,
    loggedAt: meal.loggedAt.toISOString(),
    notes: meal.notes ?? undefined,
    foods,
  };
}

function divide(value: number | null, divisor: number | null | undefined) {
  if (!value || !divisor) return 0;
  return round(value / divisor);
}

function estimateCalories(food: {
  protein: number;
  carbs: number;
  fats: number;
}) {
  return food.protein * 4 + food.carbs * 4 + food.fats * 9;
}

function formatFoodAmount(quantity: number | null, unit: string | null) {
  if (!quantity) return null;
  if (!unit) return `${round(quantity)} x serving`;
  return `${round(quantity)} ${unit}`;
}

function aggregateMealsByDate(meals: MealWithFoods[]) {
  const map = new Map<string, { protein: number; carbs: number; fats: number }>();
  for (const meal of meals) {
    const key = meal.loggedAt.toISOString().split("T")[0];
    if (!map.has(key)) {
      map.set(key, { protein: 0, carbs: 0, fats: 0 });
    }
    const totals = map.get(key)!;
    totals.protein += meal.protein ?? 0;
    totals.carbs += meal.carbs ?? 0;
    totals.fats += meal.fats ?? 0;
  }
  return map;
}

function buildWeekDays(
  weekStart: Date,
  mealsByDate: Map<string, { protein: number; carbs: number; fats: number }>,
  selectedDate: Date,
  targets: { protein?: number | null; carbs?: number | null; fats?: number | null },
) {
  const days: {
    label: string;
    dateLabel: string;
    isoDate: string;
    isActive: boolean;
    isComplete: boolean;
    compliance: number;
  }[] = [];

  for (let i = 0; i < 7; i += 1) {
    const date = addDays(weekStart, i);
    const key = date.toISOString().split("T")[0];
    const totals = mealsByDate.get(key) ?? { protein: 0, carbs: 0, fats: 0 };
    const compliance = calculateCompliance(totals, targets);
    days.push({
      label: date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3),
      dateLabel: String(date.getDate()).padStart(2, "0"),
      isoDate: key,
      isActive: key === selectedDate.toISOString().split("T")[0],
      isComplete: (totals.protein ?? 0) + (totals.carbs ?? 0) + (totals.fats ?? 0) > 0,
      compliance,
    });
  }

  return days;
}

function calculateCompliance(
  consumed: { protein: number; carbs: number; fats: number },
  target: { protein?: number | null; carbs?: number | null; fats?: number | null },
) {
  const ratios: number[] = [];

  if (target.protein) ratios.push(consumed.protein / target.protein);
  if (target.carbs) ratios.push(consumed.carbs / target.carbs);
  if (target.fats) ratios.push(consumed.fats / target.fats);

  if (!ratios.length) return 0;

  const average = ratios.reduce((acc, ratio) => acc + Math.min(ratio, 1.2), 0) / ratios.length;
  return Math.min(100, Math.max(0, Math.round(average * 100)));
}

function calculateStreakDays(recentMeals: { loggedAt: Date }[], startDate: Date) {
  const mealDays = new Set(
    recentMeals.map((meal) => meal.loggedAt.toISOString().split("T")[0]),
  );

  let streak = 0;
  for (let offset = 0; offset < 30; offset += 1) {
    const day = addDays(startDate, -offset);
    const key = day.toISOString().split("T")[0];
    if (mealDays.has(key)) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function buildWeightSeries(
  logs: Array<{ recordedFor: Date; weightLbs: number }>,
) {
  const alpha = 2 / (7 + 1);
  let trend = 0;
  const series: WeightPoint[] = [];

  logs.forEach((log, index) => {
    const weight = log.weightLbs;
    trend = index === 0 ? weight : weight * alpha + trend * (1 - alpha);
    const goal = logs[0] ? logs[0].weightLbs - index * 0.4 : weight;

    series.push({
      date: log.recordedFor.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      weight: round(weight),
      trend: round(trend),
      goal: round(goal),
    });
  });

  return series;
}

function calculateWeeklyChange(
  logs: Array<{ recordedFor: Date; weightLbs: number }>,
) {
  if (logs.length < 2) return null;
  const latest = logs.at(-1)!;
  const referenceDate = addDays(latest.recordedFor, -7);
  let reference: typeof latest | null = null;

  for (const log of logs) {
    if (log.recordedFor <= referenceDate) {
      reference = log;
    }
  }

  if (!reference) return null;
  return round(latest.weightLbs - reference.weightLbs, 1);
}

function getWeekNumber(date: Date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.valueOf() - firstThursday.valueOf();
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

function GuestLanding({ experienceId }: { experienceId?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-lg space-y-6 rounded-3xl border border-black/5 bg-white p-10 text-center shadow-sm shadow-black/5">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
          Macro Tracker for Whop
          {experienceId ? (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent">
              #{experienceId}
            </span>
          ) : null}
        </span>
        <h1 className="text-3xl font-semibold text-foreground">
          Open inside your Whop experience
        </h1>
        <p className="text-sm leading-6 text-foreground/70">
          This dashboard pulls your members, meals, and weigh-ins using Whop’s
          secure session token. Launch the app from your Whop creator account
          (or test via the Whop dev proxy) to start logging macros.
        </p>
        <div className="space-y-2 rounded-2xl border border-dashed border-foreground/20 bg-muted/40 p-4 text-left text-xs text-foreground/60">
          <p className="font-semibold text-foreground/70">Quick steps:</p>
          <ol className="space-y-1 list-decimal pl-4">
            <li>Enable the Whop dev proxy and open the app.</li>
            <li>Log a weigh-in or meal to see live data.</li>
            <li>Invite members once you’re ready for beta.</li>
          </ol>
        </div>
        <p className="text-xs text-foreground/50">
          Need help? Drop the app into your Whop experience and ping us to wire
          up the rest of the flows.
        </p>
      </div>
    </main>
  );
}

function DashboardUnavailable({ experienceId }: { experienceId?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-lg space-y-6 rounded-3xl border border-black/5 bg-white p-10 text-center shadow-sm shadow-black/5">
        <span className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-destructive">
          Macro Tracker
          {experienceId ? (
            <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] text-destructive">
              #{experienceId}
            </span>
          ) : null}
        </span>
        <h1 className="text-3xl font-semibold text-foreground">
          We can&apos;t load your dashboard right now
        </h1>
        <p className="text-sm leading-6 text-foreground/70">
          Our servers returned an unexpected error while fetching your meals and
          weigh-ins. Please refresh in a moment, or reopen the app from Whop.
        </p>
        <p className="text-xs text-foreground/50">
          If the issue persists, reach out to support and mention the launch
          digest shown in your Whop review.
        </p>
      </div>
    </main>
  );
}

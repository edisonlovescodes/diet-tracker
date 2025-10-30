'use client';

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EditableMeal, EditableMealFood } from "@/types/nutrition";

type MealFormProps = {
  initial?: EditableMeal | null;
  defaultDate: string;
  onClose: () => void;
  experienceId?: string | null;
};

type FoodOption = {
  id: string;
  type: "catalog" | "custom";
  name: string;
  brand?: string | null;
  servingSize?: number | null;
  servingUnit?: string | null;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatsPerUnit: number;
  caloriesPerUnit?: number | null;
};

type ApiFood = {
  id: string;
  name: string;
  brand?: string | null;
  servingSize?: number | null;
  servingUnit?: string | null;
  proteinPerUnit?: number | null;
  carbsPerUnit?: number | null;
  fatsPerUnit?: number | null;
  caloriesPerUnit?: number | null;
};

type FoodsResponse = {
  data?: {
    catalog?: ApiFood[];
    custom?: ApiFood[];
  };
};

type QuickAddState = {
  name: string;
  brand: string;
  protein: string;
  carbs: string;
  fats: string;
  calories: string;
};

const MACRO_INPUTS = [
  { key: "protein", label: "Protein" },
  { key: "carbs", label: "Carbs" },
  { key: "fats", label: "Fats" },
] as const;

const QUICK_ADD_FIELDS = [
  { key: "protein", label: "Protein (g)" },
  { key: "carbs", label: "Carbs (g)" },
  { key: "fats", label: "Fats (g)" },
  { key: "calories", label: "Calories" },
] as const;

type MealItem = EditableMealFood & { key: string };

export function MealForm({
  initial,
  defaultDate,
  onClose,
  experienceId,
}: MealFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [loggedAt, setLoggedAt] = useState(
    toLocalInput(initial?.loggedAt ?? defaultDate),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [items, setItems] = useState<MealItem[]>(
    () =>
      initial?.foods.map((food) => ({
        ...food,
        key: crypto.randomUUID(),
      })) ?? [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState<QuickAddState>({
    name: "",
    brand: "",
    protein: "",
    carbs: "",
    fats: "",
    calories: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const { protein, carbs, fats, calories } = scaleMacros(
          item.macrosPerUnit,
          item.quantity,
        );
        acc.protein += protein;
        acc.carbs += carbs;
        acc.fats += fats;
        acc.calories += calories ?? 0;
        return acc;
      },
      { protein: 0, carbs: 0, fats: 0, calories: 0 },
    );
  }, [items]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!items.length) {
      setError("Add at least one food to log this meal.");
      return;
    }

    const payload = {
      name: name.trim() || "Meal",
      loggedAt: new Date(loggedAt).toISOString(),
      notes: notes.trim() ? notes.trim() : undefined,
      foods: items.map((item) => ({
        foodId: item.foodId ?? undefined,
        customFoodId: item.customFoodId ?? undefined,
        source: item.source,
        name: item.name,
        brand: item.brand ?? undefined,
        quantity: item.quantity,
        servingUnit: item.servingUnit ?? undefined,
        macrosPerUnit: item.macrosPerUnit,
        quickAddMacros:
          item.source === "QUICK_ADD" ? item.macrosPerUnit : undefined,
      })),
    };

    startTransition(async () => {
      const response = await fetch(
        initial?.id ? `/api/meals/${initial.id}` : "/api/meals",
        {
          method: initial?.id ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(experienceId
              ? { "X-Whop-Experience-Id": experienceId }
              : {}),
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Failed to save meal.");
        return;
      }

      router.refresh();
      onClose();
    });
  }

  function handleAddOption(option: FoodOption) {
    setItems((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        source: option.type === "custom" ? "CUSTOM" : "USDA",
        foodId: option.type === "catalog" ? option.id : undefined,
        customFoodId: option.type === "custom" ? option.id : undefined,
        name: option.name,
        brand: option.brand,
        servingSize: option.servingSize,
        servingUnit: option.servingUnit,
        quantity: 1,
        macrosPerUnit: {
          protein: option.proteinPerUnit,
          carbs: option.carbsPerUnit,
          fats: option.fatsPerUnit,
          calories: option.caloriesPerUnit ?? undefined,
        },
      },
    ]);
    setSearchQuery("");
    setSearchResults([]);
  }

  function handleQuantityChange(key: string, quantity: number) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return;
    }
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, quantity } : item,
      ),
    );
  }

  function handleMacroChange(
    key: string,
    field: "protein" | "carbs" | "fats" | "calories",
    value: number,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? {
              ...item,
              macrosPerUnit: {
                ...item.macrosPerUnit,
                [field]: value,
              },
            }
          : item,
      ),
    );
  }

  function handleRemoveItem(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  function handleQuickAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const protein = Number(quickAdd.protein || 0);
    const carbs = Number(quickAdd.carbs || 0);
    const fats = Number(quickAdd.fats || 0);
    const calories = quickAdd.calories
      ? Number(quickAdd.calories)
      : protein * 4 + carbs * 4 + fats * 9;

    if (!quickAdd.name.trim()) {
      setError("Name your quick add food.");
      return;
    }

    setItems((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        source: "QUICK_ADD",
        name: quickAdd.name.trim(),
        brand: quickAdd.brand.trim() || undefined,
        quantity: 1,
        macrosPerUnit: {
          protein,
          carbs,
          fats,
          calories,
        },
      },
    ]);

    setQuickAdd({
      name: "",
      brand: "",
      protein: "",
      carbs: "",
      fats: "",
      calories: "",
    });
  }

  async function handleDelete() {
    if (!initial?.id) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/meals/${initial.id}`, {
        method: "DELETE",
        headers: {
          ...(experienceId
            ? { "X-Whop-Experience-Id": experienceId }
            : {}),
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Failed to delete meal.");
        return;
      }
      router.refresh();
      onClose();
    });
  }

  async function handleSearch(input: string) {
    setSearchQuery(input);
    setSearchError(null);

    if (input.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        q: input.trim(),
        limit: "20",
      });
      const response = await fetch(`/api/foods?${params.toString()}`, {
        cache: "no-store",
        headers: experienceId
          ? { "X-Whop-Experience-Id": experienceId }
          : {},
      });
      if (!response.ok) {
        throw new Error("Request failed");
      }
      const data = (await response.json()) as FoodsResponse;
      const results: FoodOption[] = [
        ...(data.data?.catalog ?? []).map((item) =>
          normalizeFoodOption(item, "catalog"),
        ),
        ...(data.data?.custom ?? []).map((item) =>
          normalizeFoodOption(item, "custom"),
        ),
      ];
      setSearchResults(results);
    } catch (fetchError) {
      console.error(fetchError);
      setSearchError("Unable to load foods. Try again.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-foreground/80">
          Meal name
        </label>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          placeholder="Breakfast"
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-base shadow-inner shadow-black/5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-foreground/80">
          Logged at
        </label>
        <input
          type="datetime-local"
          value={loggedAt}
          onChange={(event) => setLoggedAt(event.target.value)}
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-base shadow-inner shadow-black/5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-foreground/80">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          maxLength={240}
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-inner shadow-black/5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          placeholder="Lift day pre-workout meal."
        />
        <span className="text-right text-xs text-foreground/50">
          {notes.length}/240
        </span>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-foreground/80">
          Food search
        </label>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder="Search chicken, rice, etc."
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-base shadow-inner shadow-black/5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        {searchError ? (
          <p className="text-xs text-accent">{searchError}</p>
        ) : null}
        {searchResults.length ? (
          <ul className="mt-2 space-y-2 rounded-2xl border border-black/5 bg-muted/40 p-3 text-sm">
            {searchResults.map((result) => (
              <li
                key={`${result.type}-${result.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm shadow-black/5"
              >
                <div>
                  <p className="font-semibold text-foreground">{result.name}</p>
                  <p className="text-xs uppercase tracking-wide text-foreground/50">
                    {[
                      result.brand,
                      formatServing(result.servingSize, result.servingUnit),
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddOption(result)}
                  className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background transition hover:bg-accent"
                  disabled={isPending}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        ) : isSearching ? (
          <p className="text-xs text-foreground/60">Searching foods…</p>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/60">
            Meal items
          </h3>
          <span className="text-xs text-foreground/50">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="space-y-3">
          {items.map((item) => {
            const totals = scaleMacros(item.macrosPerUnit, item.quantity);
            return (
              <div
                key={item.key}
                className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm shadow-black/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {item.name}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-foreground/50">
                      {[
                        item.brand,
                        formatServing(
                          item.servingSize,
                          item.servingUnit,
                          item.quantity,
                        ),
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.key)}
                    className="rounded-full px-3 py-1 text-xs font-semibold text-foreground/40 transition hover:text-accent"
                    disabled={isPending}
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                    Qty
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={item.quantity}
                      onChange={(event) =>
                        handleQuantityChange(
                          item.key,
                          Number(event.target.value),
                        )
                      }
                      className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm shadow-inner outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                  </label>
                  {MACRO_INPUTS.map(({ key, label }) => (
                    <label
                      key={key}
                      className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-foreground/50"
                    >
                      {label} (g)
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.macrosPerUnit[key]}
                        onChange={(event) =>
                          handleMacroChange(
                            item.key,
                            key,
                            Number(event.target.value),
                          )
                        }
                        className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm shadow-inner outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                        disabled={item.source !== "QUICK_ADD"}
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-3 flex gap-4 text-xs font-semibold text-foreground/60">
                  <span>P {totals.protein.toFixed(1)}g</span>
                  <span>C {totals.carbs.toFixed(1)}g</span>
                  <span>F {totals.fats.toFixed(1)}g</span>
                  {typeof totals.calories === "number" ? (
                    <span>{Math.round(totals.calories)} cal</span>
                  ) : null}
                </div>
              </div>
            );
          })}
          {!items.length && (
            <p className="rounded-3xl border border-dashed border-foreground/20 bg-muted/40 px-4 py-5 text-center text-sm text-foreground/50">
              Search foods or add a quick macro entry to build this meal.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-black/10 bg-muted/40 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/60">
          Quick add
        </h3>
        <p className="text-xs text-foreground/50">
          Log a custom food on the fly. Values are per serving.
        </p>
        <form className="mt-3 grid gap-3 sm:grid-cols-3" onSubmit={handleQuickAdd}>
          <input
            type="text"
            placeholder="Food name"
            value={quickAdd.name}
            onChange={(event) =>
              setQuickAdd((prev) => ({ ...prev, name: event.target.value }))
            }
            className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm shadow-inner outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 sm:col-span-2"
          />
          <input
            type="text"
            placeholder="Brand (optional)"
            value={quickAdd.brand}
            onChange={(event) =>
              setQuickAdd((prev) => ({ ...prev, brand: event.target.value }))
            }
            className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm shadow-inner outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {QUICK_ADD_FIELDS.map(({ key, label }) => (
            <input
              key={key}
              type="number"
              min="0"
              step="0.1"
              placeholder={label}
              value={quickAdd[key]}
              onChange={(event) =>
                setQuickAdd((prev) => ({ ...prev, [key]: event.target.value }))
              }
              className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm shadow-inner outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          ))}
          <button
            type="submit"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent"
            disabled={isPending}
          >
            Add quick entry
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between rounded-3xl border border-black/10 bg-white px-5 py-4 text-sm font-semibold shadow-sm shadow-black/5">
        <span className="text-foreground/60">Meal totals</span>
        <div className="flex gap-4 text-foreground">
          <span>P {totals.protein.toFixed(1)}g</span>
          <span>C {totals.carbs.toFixed(1)}g</span>
          <span>F {totals.fats.toFixed(1)}g</span>
          <span>{Math.round(totals.calories)} cal</span>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {initial?.id ? (
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/40 transition hover:text-accent"
            disabled={isPending}
          >
            Delete
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-foreground/60 transition hover:border-foreground/20 hover:text-foreground"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition hover:bg-accent/90 disabled:opacity-70"
          disabled={isPending}
        >
          {initial?.id ? "Update Meal" : "Save Meal"}
        </button>
      </div>
    </form>
  );
}

function scaleMacros(
  macros: EditableMealFood["macrosPerUnit"],
  quantity: number,
) {
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    protein: round((macros.protein ?? 0) * quantity),
    carbs: round((macros.carbs ?? 0) * quantity),
    fats: round((macros.fats ?? 0) * quantity),
    calories: macros.calories
      ? Math.round((macros.calories ?? 0) * quantity)
      : null,
  };
}

function normalizeFoodOption(item: ApiFood, type: "catalog" | "custom"): FoodOption {
  return {
    id: item.id,
    type,
    name: item.name,
    brand: item.brand ?? undefined,
    servingSize: item.servingSize ?? undefined,
    servingUnit: item.servingUnit ?? undefined,
    proteinPerUnit: item.proteinPerUnit ?? 0,
    carbsPerUnit: item.carbsPerUnit ?? 0,
    fatsPerUnit: item.fatsPerUnit ?? 0,
    caloriesPerUnit: item.caloriesPerUnit ?? null,
  };
}

function formatServing(
  servingSize?: number | null,
  servingUnit?: string | null,
  quantity = 1,
) {
  if (!servingSize && !servingUnit) return null;
  if (!servingSize) {
    return `${quantity} ${servingUnit ?? ""}`.trim();
  }
  const total = servingSize * quantity;
  return `${total}${servingUnit ?? "g"}`;
}

function toLocalInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const pad = (num: number) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

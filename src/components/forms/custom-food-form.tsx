'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EditableCustomFood } from "@/types/nutrition";

type FormState = {
  name: string;
  brand: string;
  servingSize: string;
  servingUnit: string;
  proteinPerUnit: string;
  carbsPerUnit: string;
  fatsPerUnit: string;
  caloriesPerUnit: string;
};

type MacroFieldKey = "proteinPerUnit" | "carbsPerUnit" | "fatsPerUnit" | "caloriesPerUnit";

const MACRO_FIELDS: Array<{ key: MacroFieldKey; label: string }> = [
  { key: "proteinPerUnit", label: "Protein (g)" },
  { key: "carbsPerUnit", label: "Carbs (g)" },
  { key: "fatsPerUnit", label: "Fats (g)" },
  { key: "caloriesPerUnit", label: "Calories" },
];

type CustomFoodFormProps = {
  initial?: EditableCustomFood | null;
  onClose: () => void;
  onSuccess?: (food: EditableCustomFood & { id: string }) => void;
  experienceId?: string | null;
};

export function CustomFoodForm({
  initial,
  onClose,
  onSuccess,
  experienceId,
}: CustomFoodFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: initial?.name ?? "",
    brand: initial?.brand ?? "",
    servingSize: initial?.servingSize?.toString() ?? "100",
    servingUnit: initial?.servingUnit ?? "g",
    proteinPerUnit: initial?.proteinPerUnit?.toString() ?? "0",
    carbsPerUnit: initial?.carbsPerUnit?.toString() ?? "0",
    fatsPerUnit: initial?.fatsPerUnit?.toString() ?? "0",
    caloriesPerUnit: initial?.caloriesPerUnit?.toString() ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      servingSize: Number(form.servingSize || 0),
      servingUnit: form.servingUnit.trim() || "g",
      proteinPerUnit: Number(form.proteinPerUnit || 0),
      carbsPerUnit: Number(form.carbsPerUnit || 0),
      fatsPerUnit: Number(form.fatsPerUnit || 0),
      caloriesPerUnit: form.caloriesPerUnit
        ? Number(form.caloriesPerUnit)
        : undefined,
    };

    if (!payload.name) {
      setError("Name is required.");
      return;
    }

    if (!payload.servingSize || Number.isNaN(payload.servingSize)) {
      setError("Provide a serving size.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(
        initial?.id ? `/api/custom-foods/${initial.id}` : "/api/custom-foods",
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
        setError(data?.error ?? "Failed to save food item.");
        return;
      }

      const data = await response.json();
      const saved = data.data as EditableCustomFood & { id: string };
      onSuccess?.(saved);
      router.refresh();
      onClose();
    });
  }

  async function handleDelete() {
    if (!initial?.id) return;
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/custom-foods/${initial.id}`, {
        method: "DELETE",
        headers: {
          ...(experienceId
            ? { "X-Whop-Experience-Id": experienceId }
            : {}),
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Failed to delete food.");
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-foreground/80">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          maxLength={120}
          className="field-control text-base"
          placeholder="Overnight oats"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-foreground/80">Brand</label>
        <input
          type="text"
          value={form.brand}
          onChange={(event) => update("brand", event.target.value)}
          maxLength={120}
          className="field-control text-base"
          placeholder="Homemade"
        />
      </div>

      <div className="grid grid-cols-[2fr,1fr] gap-3">
        <label className="grid gap-2 text-sm font-semibold text-foreground/80">
          Serving size
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={form.servingSize}
            onChange={(event) => update("servingSize", event.target.value)}
            className="field-control text-base"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-foreground/80">
          Unit
          <input
            type="text"
            value={form.servingUnit}
            onChange={(event) => update("servingUnit", event.target.value)}
            className="field-control text-base"
            required
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MACRO_FIELDS.map((macro) => (
          <label
            key={macro.key}
            className="grid gap-2 text-sm font-semibold text-foreground/80"
          >
            {macro.label}
            <input
              type="number"
              min="0"
              step="0.1"
              value={form[macro.key]}
              onChange={(event) => update(macro.key, event.target.value)}
              className="field-control text-base"
            />
          </label>
        ))}
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
          className="rounded-full border border-[color:var(--gray-a5)] px-4 py-2 text-sm font-semibold text-foreground/60 transition hover:border-accent/50 hover:text-foreground"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition hover:bg-accent/90 disabled:opacity-70"
          disabled={isPending}
        >
          {initial?.id ? "Update Food" : "Save Food"}
        </button>
      </div>
    </form>
  );
}

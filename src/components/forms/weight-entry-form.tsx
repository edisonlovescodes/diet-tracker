'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type WeightEntryFormProps = {
  initial?:
    | {
        id: string;
        weightLbs: number;
        recordedFor: string;
        note?: string | null;
      }
    | null;
  defaultDate: string;
  onClose: () => void;
  experienceId?: string | null;
};

export function WeightEntryForm({
  initial,
  defaultDate,
  experienceId,
  onClose,
}: WeightEntryFormProps) {
  const router = useRouter();
  const [weight, setWeight] = useState(
    initial?.weightLbs ? initial.weightLbs.toString() : "",
  );
  const [recordedFor, setRecordedFor] = useState(
    initial?.recordedFor
      ? toLocalInput(initial.recordedFor)
      : toLocalInput(defaultDate),
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      weightLbs: Number(weight),
      recordedFor: new Date(recordedFor).toISOString(),
      note: note.trim() ? note.trim() : undefined,
    };

    if (!payload.weightLbs || Number.isNaN(payload.weightLbs)) {
      setError("Enter a valid bodyweight.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(
        initial ? `/api/weights/${initial.id}` : "/api/weights",
        {
          method: initial ? "PATCH" : "POST",
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
        setError(data?.error ?? "Failed to save weigh-in.");
        return;
      }

      router.refresh();
      onClose();
    });
  }

  async function handleDelete() {
    if (!initial) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/weights/${initial.id}`, {
        method: "DELETE",
        headers: {
          ...(experienceId
            ? { "X-Whop-Experience-Id": experienceId }
            : {}),
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Failed to delete weigh-in.");
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground/80">
          Weight (lb)
        </label>
        <input
          type="number"
          min="50"
          max="800"
          step="0.1"
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-base shadow-inner shadow-black/5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          placeholder="185.4"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground/80">
          Recorded at
        </label>
        <input
          type="datetime-local"
          value={recordedFor}
          onChange={(event) => setRecordedFor(event.target.value)}
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-base shadow-inner shadow-black/5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground/80">
          Notes (optional)
        </label>
        <textarea
          value={note}
          maxLength={140}
          rows={3}
          onChange={(event) => setNote(event.target.value)}
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm leading-5 shadow-inner shadow-black/5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          placeholder="Morning weigh-in, post-restroom."
        />
        <span className="text-right text-xs text-foreground/50">
          {note.length}/140
        </span>
      </div>

      {error ? (
        <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3 pt-2">
        {initial ? (
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
          {initial ? "Update Weigh-in" : "Save Weigh-in"}
        </button>
      </div>
    </form>
  );
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

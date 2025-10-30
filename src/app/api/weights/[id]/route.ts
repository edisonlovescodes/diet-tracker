import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireSessionFromRequest,
  UnauthorizedError,
} from "@/lib/session";

const updateSchema = z.object({
  weightLbs: z.number().min(50).max(800).optional(),
  recordedFor: z
    .string()
    .transform((value) => new Date(value))
    .refine((value) => !Number.isNaN(value.getTime()), {
      message: "Invalid recordedFor date.",
    })
    .optional(),
  note: z.string().max(140).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSessionFromRequest(request);
    const payload = updateSchema.parse(await request.json());
    const { id } = await context.params;

    const existing = await prisma.weightLog.findUnique({
      where: { id },
    });

    const experienceMatch =
      (existing?.experienceId ?? null) === (session.experienceId ?? null);

    if (!existing || existing.userId !== session.user.id || !experienceMatch) {
      return NextResponse.json(
        { error: "Weight log not found." },
        { status: 404 },
      );
    }

    const weightLog = await prisma.weightLog.update({
      where: { id },
      data: {
        weightLbs: payload.weightLbs ?? existing.weightLbs,
        recordedFor: payload.recordedFor ?? existing.recordedFor,
        note: payload.note ?? existing.note,
      },
    });

    return NextResponse.json({ data: weightLog });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSessionFromRequest(request);
    const { id } = await context.params;

    const existing = await prisma.weightLog.findUnique({
      where: { id },
    });

    const experienceMatch =
      (existing?.experienceId ?? null) === (session.experienceId ?? null);

    if (!existing || existing.userId !== session.user.id || !experienceMatch) {
      return NextResponse.json(
        { error: "Weight log not found." },
        { status: 404 },
      );
    }

    await prisma.weightLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid request payload.", details: error.flatten() },
      { status: 422 },
    );
  }

  console.error("[weights:id] unexpected error", error);
  return NextResponse.json(
    { error: "Something went wrong." },
    { status: 500 },
  );
}

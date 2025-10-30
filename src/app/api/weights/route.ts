import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireSessionFromRequest,
  UnauthorizedError,
} from "@/lib/session";

const createWeightSchema = z.object({
  weightLbs: z.number().min(50).max(800),
  recordedFor: z
    .string()
    .transform((value) => new Date(value))
    .refine((value) => !Number.isNaN(value.getTime()), {
      message: "Invalid recordedFor date.",
    }),
  note: z.string().max(140).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireSessionFromRequest(request);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "30");
    const experienceWhere =
      session.experienceId === null
        ? { experienceId: null }
        : session.experienceId
          ? { experienceId: session.experienceId }
          : {};

    const weightLogs = await prisma.weightLog.findMany({
      where: { userId: session.user.id, ...experienceWhere },
      orderBy: { recordedFor: "desc" },
      take: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 120)) : 30,
    });

    return NextResponse.json({ data: weightLogs });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSessionFromRequest(request);
    const payload = createWeightSchema.parse(await request.json());

    const weightLog = await prisma.weightLog.create({
      data: {
        userId: session.user.id,
        experienceId: session.experienceId ?? null,
        weightLbs: payload.weightLbs,
        recordedFor: payload.recordedFor,
        note: payload.note,
      },
    });

    return NextResponse.json(
      { data: weightLog },
      {
        status: 201,
      },
    );
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

  console.error("[weights] unexpected error", error);
  return NextResponse.json(
    { error: "Something went wrong." },
    { status: 500 },
  );
}

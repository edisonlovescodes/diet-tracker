import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireSessionFromRequest,
  UnauthorizedError,
} from "@/lib/session";
import { customFoodSchema } from "@/app/api/custom-foods/schemas";

const updateSchema = customFoodSchema.partial();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSessionFromRequest(request);
    const payload = updateSchema.parse(await request.json());
    const { id } = await context.params;

    const existing = await prisma.customFood.findUnique({
      where: { id },
    });

    const experienceMatch =
      (existing?.experienceId ?? null) === (session.experienceId ?? null);

    if (!existing || existing.userId !== session.user.id || !experienceMatch) {
      return NextResponse.json({ error: "Food not found." }, { status: 404 });
    }

    const food = await prisma.customFood.update({
      where: { id: existing.id },
      data: {
        name: payload.name ?? existing.name,
        brand: payload.brand ?? existing.brand,
        servingSize: payload.servingSize ?? existing.servingSize,
        servingUnit: payload.servingUnit ?? existing.servingUnit,
        proteinPerUnit: payload.proteinPerUnit ?? existing.proteinPerUnit,
        carbsPerUnit: payload.carbsPerUnit ?? existing.carbsPerUnit,
        fatsPerUnit: payload.fatsPerUnit ?? existing.fatsPerUnit,
        caloriesPerUnit:
          payload.caloriesPerUnit ?? existing.caloriesPerUnit ?? null,
      },
    });

    return NextResponse.json({ data: food });
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
    const existing = await prisma.customFood.findUnique({
      where: { id },
    });

    const experienceMatch =
      (existing?.experienceId ?? null) === (session.experienceId ?? null);

    if (!existing || existing.userId !== session.user.id || !experienceMatch) {
      return NextResponse.json({ error: "Food not found." }, { status: 404 });
    }

    await prisma.customFood.delete({
      where: { id: existing.id },
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

  console.error("[custom-foods:id] unexpected error", error);
  return NextResponse.json(
    { error: "Something went wrong." },
    { status: 500 },
  );
}

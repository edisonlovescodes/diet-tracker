import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireSessionFromRequest,
  UnauthorizedError,
} from "@/lib/session";
import {
  updateMealSchema,
  buildMealFoodInputs,
} from "@/app/api/meals/utils";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSessionFromRequest(request);
    const { id } = await context.params;
    const meal = await prisma.meal.findUnique({
      where: { id },
      include: { foods: true },
    });

    if (!meal || meal.userId !== session.user.id) {
      return NextResponse.json({ error: "Meal not found." }, { status: 404 });
    }

    return NextResponse.json({ data: meal });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSessionFromRequest(request);
    const payload = updateMealSchema.parse(await request.json());
    const { id } = await context.params;

    const existing = await prisma.meal.findUnique({
      where: { id },
      include: { foods: true },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Meal not found." }, { status: 404 });
    }

    let totals = {
      protein: existing.protein,
      carbs: existing.carbs,
      fats: existing.fats,
    };

    let foodUpdate:
      | {
          deleteMany: { mealId: string }[];
          createMany: { data: Awaited<ReturnType<typeof buildMealFoodInputs>>["items"] };
        }
      | undefined;

    if (payload.foods?.length) {
      const prepared = await buildMealFoodInputs({
        foods: payload.foods,
        userId: session.user.id,
      });

      foodUpdate = {
        deleteMany: [{ mealId: existing.id }],
        createMany: {
          data: prepared.items,
        },
      };

      totals = prepared.total;
    }

    const meal = await prisma.meal.update({
      where: { id: existing.id },
      data: {
        name: payload.name ?? existing.name,
        loggedAt: payload.loggedAt ?? existing.loggedAt,
        notes: payload.notes ?? existing.notes,
        protein: totals.protein,
        carbs: totals.carbs,
        fats: totals.fats,
        ...(foodUpdate && { foods: foodUpdate }),
      },
      include: { foods: true },
    });

    return NextResponse.json({ data: meal });
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

    const existing = await prisma.meal.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Meal not found." }, { status: 404 });
    }

    await prisma.meal.delete({
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

  console.error("[meals:id] unexpected error", error);
  return NextResponse.json(
    { error: "Something went wrong." },
    { status: 500 },
  );
}
